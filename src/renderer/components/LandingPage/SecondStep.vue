<template>
  <div id="second-step">
    <div class="progress-bar" v-for="(droplet, index) in dropletIps" :key="index">
      <h2>Masternode #{{index}}</h2>
      <progress class="progress" :value="droplet.progress" max="100">{{droplet.progress}}%</progress>
      <small>{{droplet.currentStatus}}</small>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import fs from 'fs';

export default {
  data() {
    return {
      dropletIps: [],
      fill: { gradient: ['#1E8DE0', '#348584'] },
      DOAvailableRegions: [],
      totalBlocks: 0,
    };
  },
  computed: {
    currentStep() {
      return this.$store.state.Steps.currentStep;
    },
    mnName() {
      return this.$store.state.Information.mnName;
    },
    mnConfPath() {
      return this.$store.state.Information.mnConfPath;
    },
  },
  methods: {
    lookForIp(ip, index) {
      const firestore = window.firebase.firestore();
      const settings = { timestampsInSnapshots: true };
      firestore.settings(settings);

      console.log('i will look for the ip', ip);

      firestore
        .collection('ips')
        .where('ip', '==', ip)
        .onSnapshot((results) => {
          if (results.size) {
            results.forEach((doc) => {
              this.dropletIps[index].currentVpsStep = Number(doc.data().step);
              this.dropletIps[index].progress = 9.09 * this.dropletIps[index].currentVpsStep;
              if (this.dropletIps[index].currentVpsStep === 1) {
                this.dropletIps[index].currentStatus = 'Provisioning VPS... This task may take a few minutes.';
              } else if (this.dropletIps[index].currentVpsStep === 2) {
                this.dropletIps[index].currentStatus = 'Adding swap space...';
              } else if (this.dropletIps[index].currentVpsStep === 3) {
                this.dropletIps[index].currentStatus = 'Updating system...';
              } else if (this.dropletIps[index].currentVpsStep === 4) {
                this.dropletIps[index].currentStatus = 'Installing base packages...';
              } else if (this.dropletIps[index].currentVpsStep === 5) {
                this.dropletIps[index].currentStatus = 'Installing fail2ban...';
              } else if (this.dropletIps[index].currentVpsStep === 6) {
                this.dropletIps[index].currentStatus = 'Configuring Firewall...';
              } else if (this.dropletIps[index].currentVpsStep === 7) {
                this.dropletIps[index].currentStatus = 'Putting gears in Motion...';
              } else if (this.dropletIps[index].currentVpsStep === 8) {
                this.dropletIps[index].currentStatus = 'Downloading Motion in the server...';
              } else if (this.dropletIps[index].currentVpsStep === 9) {
                this.dropletIps[index].currentStatus = 'Installing Sentinel...';
                axios.get('https://explorer.motionproject.org/api/getblockcount')
                  .then((response) => {
                    this.totalBlocks = Number(response.data);
                  });
              } else if (this.dropletIps[index].currentVpsStep === 10) {
                this.dropletIps[index].currentStatus = `Syncing Masternode... This step could take a while... Block ${doc.data().syncedBlocks} of ${this.totalBlocks}.`;
              } else if (this.dropletIps[index].currentVpsStep === 11) {
                this.dropletIps[index].currentStatus = 'Done!';
                fs.appendFileSync(`${this.mnConfPath}/masternode.conf`,
                  `\n${this.mnName}-${index} ${this.dropletIps[index].ip}:7979 ${this.dropletIps[index].privkey} ${this.dropletIps[index].output} ${this.dropletIps[index].txNumber}`);

                this.lookForSecureChangeStep();
              }
            });
          }
          //  else {
          //   console.log('not found');
          //   this.lookForIp();
          // }
        });
    },
    createDroplet(genkey, name, index) {
      axios.post('https://api.digitalocean.com/v2/droplets', {
        name,
        region: this.DOAvailableRegions[Math.floor(Math.random() * this.DOAvailableRegions.length)],
        size: 's-1vcpu-1gb',
        image: 'ubuntu-16-04-x64',
        ipv6: false,
        tags: ['xmn', 'masternode'],
        user_data: `#cloud-config
package_upgrade: true

packages:
  - nano
  - wget
  - unzip
  - curl

runcmd:
  - wget https://raw.githubusercontent.com/motioncrypto/motion-docs/master/scripts/masternode.sh
  - chmod +x masternode.sh
  - ./masternode.sh ${genkey} -y installer`,
      }, {
        headers: {
          Authorization: `Bearer ${this.$store.state.Information.accessToken}`,
        },
      })
      // eslint-disable-next-line
        .then((response) => {
          return new Promise((resolve) => {
            // eslint-disable-next-line
            setTimeout(() => {
              resolve(axios.get(`https://api.digitalocean.com/v2/droplets/${response.data.droplet.id}`, {
                headers: {
                  Authorization: `Bearer ${this.$store.state.Information.accessToken}`,
                },
              }));
            }, 120000);
          });
        })
        .then((response) => {
          this.dropletIps[index].ip = response.data.droplet.networks.v4[0].ip_address;
          this.$store.commit('SET_IP', {
            ip: response.data.droplet.networks.v4[0].ip_address,
          });
          if (response.data.droplet && response.data.droplet.id) {
            this.lookForIp(response.data.droplet.networks.v4[0].ip_address, index);
          } else {
            this.createDroplet(genkey, name, index);
          }
        })
        .catch((e) => {
          if (!this.dropletIps[index].retriedInstall) {
            this.dropletIps[index].retriedInstall = true;
            this.createDroplet(genkey, name, index);
          }
          console.error('Error', e);
        });
    },
    iterateCreateDroplet() {
      const dropletsToCreate = this.$store.state.Information.genkeys.length;
      console.log('Droplets to create:', dropletsToCreate);

      for (let i = 0; i < dropletsToCreate; i += 1) {
        this.dropletIps.push({
          ip: null,
          currentVpsStep: 0,
          progress: 0,
          currentStatus: 'Provisioning VPS... This task may take a few minutes.',
          privkey: this.$store.state.Information.genkeys[i],
          output: this.$store.state.Information.outputs[i].txid,
          txNumber: this.$store.state.Information.outputs[i].txnumber,
          retriedInstall: false,
        });
        this.createDroplet(this.$store.state.Information.genkeys[i], `xmn-${this.mnName}-${i}`, i);
      }
    },
    lookForSecureChangeStep() {
      const unfinishedDroplets = this.dropletIps.filter(droplet => droplet.currentVpsStep !== 11);
      if (!unfinishedDroplets.length) {
        this.$store.commit('SET_STEP', {
          currentStep: 3,
        });
      }
    },
    getDigitalOceanAvailableRegions() {
      axios.get('https://api.digitalocean.com/v2/regions', {
        headers: {
          Authorization: `Bearer ${this.$store.state.Information.accessToken}`,
        },
      }).then((response) => {
        this.DOAvailableRegions = response.data.regions
          .filter(region => region.available && region.sizes.includes('s-1vcpu-1gb'))
          .map(region => region.slug);

        this.iterateCreateDroplet();
      });
    },
  },
  mounted() {
    this.getDigitalOceanAvailableRegions();
  },
};
</script>

<style lang="scss" scoped>
#second-step {
  width: 90%;
  margin: 0 auto;
  max-height: 100%;
  overflow: auto;
  padding-right: 30px;
}

progress {
  -webkit-appearance: none;
  border: none;
  border-radius: 290486px;
  display: block;
  height: 1rem;
  overflow: hidden;
  padding: 0;
  width: 100%;

  &::-webkit-progress-value {
    background-color: #1E8DE0;
    transition: all 0.7s;
  }

  &::-webkit-progress-bar {
    background-color:#dbdbdb;
  }
}

.progress-bar {
  margin-bottom: 30px;
}
</style>
