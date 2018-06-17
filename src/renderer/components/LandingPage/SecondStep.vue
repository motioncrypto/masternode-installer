<template>
  <div id="second-step">
    <vue-circle
      :progress="progress"
      :size="300"
      :reverse="false"
      line-cap="round"
      :fill="fill"
      empty-fill="rgba(0, 0, 0, .1)"
      :animation-start-value="0.0"
      :start-angle="0"
      insert-mode="append"
      :thickness="10"
      :show-percent="true"
      ref="progressCircle">
        <p>{{currentStatus}}</p>
    </vue-circle>
  </div>
</template>

<script>
import axios from 'axios';
import fs from 'fs';
import VueCircle from 'vue2-circle-progress';

export default {
  data() {
    return {
      dropletIp: null,
      wrote: false,
      currentVpsStep: 0,
      fill: { gradient: ['#1E8DE0', '#348584'] },
      progress: 0,
      currentStatus: 'Provisioning VPS...',
    };
  },
  components: {
    VueCircle,
  },
  computed: {
    currentStep() {
      return this.$store.state.Steps.currentStep;
    },
    privKey() {
      return this.$store.state.Information.genkey;
    },
    output() {
      return this.$store.state.Information.output;
    },
    mnName() {
      return this.$store.state.Information.mnName;
    },
    mnConfPath() {
      return this.$store.state.Information.mnConfPath;
    },
  },
  methods: {
    lookForIp() {
      const firestore = window.firebase.firestore();
      const settings = { timestampsInSnapshots: true };
      firestore.settings(settings);

      console.log('i will look for the ip', this.dropletIp);

      firestore
        .collection('ips')
        .where('ip', '==', this.dropletIp)
        .onSnapshot((results) => {
          if (results.size) {
            console.log('found');
            results.forEach((doc) => {
              console.log(doc.data());
              this.currentVpsStep = Number(doc.data().step);
              this.progress = 9.09 * this.currentVpsStep;
              this.$refs.progressCircle.updateProgress(Math.round(this.progress));
              if (this.currentVpsStep === 1) {
                this.currentStatus = 'Provisioning VPS...';
              } else if (this.currentVpsStep === 2) {
                this.currentStatus = 'Adding swap space...';
              } else if (this.currentVpsStep === 3) {
                this.currentStatus = 'Updating system...';
              } else if (this.currentVpsStep === 4) {
                this.currentStatus = 'Installing base packages...';
              } else if (this.currentVpsStep === 5) {
                this.currentStatus = 'Installing fail2ban...';
              } else if (this.currentVpsStep === 6) {
                this.currentStatus = 'Configuring Firewall...';
              } else if (this.currentVpsStep === 7) {
                this.currentStatus = 'Putting gears in Motion...';
              } else if (this.currentVpsStep === 8) {
                this.currentStatus = 'Downloading Motion in the server...';
              } else if (this.currentVpsStep === 9) {
                this.currentStatus = 'Installing Sentinel...';
              } else if (this.currentVpsStep === 10) {
                this.currentStatus = 'Syncing Masternode...';
              } else if (this.currentVpsStep === 11) {
                this.currentStatus = 'Done!';
              }
              if (this.currentVpsStep === 11) {
                fs.appendFileSync(this.mnConfPath,
                  `\n${this.mnName} ${this.dropletIp}:7979 ${this.privKey} ${this.output.txid} ${this.output.txnumber}`);
                this.$store.commit('SET_STEP', {
                  currentStep: 3,
                });
              }
            });
          }
          //  else {
          //   console.log('not found');
          //   this.lookForIp();
          // }
        });
    },
    createDroplet() {
      axios.post('https://api.digitalocean.com/v2/droplets', {
        name: `xmn-${this.mnName}`,
        region: 'nyc3',
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
  - ./masternode.sh ${this.$store.state.Information.genkey} -y installer`,
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
          this.dropletIp = response.data.droplet.networks.v4[0].ip_address;
          this.$store.commit('SET_IP', {
            ip: this.dropletIp,
          });
          if (response.data.droplet && response.data.droplet.id) {
            this.lookForIp();
          } else {
            this.createDroplet();
          }
        })
        .catch((e) => {
          console.error('Error', e);
        });
    },
  },
  mounted() {
    this.createDroplet();
  },
};
</script>
