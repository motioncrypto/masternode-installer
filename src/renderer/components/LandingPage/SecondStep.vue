<template>
  <div id="second-step">
    <vue-typed-js :strings="[
        'Doing magic...', 
        'Configuring your Masternode...',
        'Staying in Motion...',
        'Setting up gears...',
        'Preparing Coffee...',
      ]" 
      :loop="true"
      :backDelay="400"
      :typeSpeed="150"
      :shuffle="true">
      <h2 class="typing"></h2>
    </vue-typed-js>
    <div class="loading">
      <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import fs from 'fs';
import { VueTypedJs } from 'vue-typed-js';

export default {
  data() {
    return {
      dropletIp: null,
    };
  },
  components: {
    VueTypedJs,
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

      setTimeout(() => {
        firestore
          .collection('ips')
          .where('ip', '==', this.dropletIp)
          .get()
          .then((results) => {
            if (results.size) {
              console.log('found');
              fs.appendFileSync(this.mnConfPath,
                `\n${this.mnName} ${this.dropletIp}:7979 ${this.privKey} ${this.output.txid} ${this.output.txnumber}`);
              this.$store.commit('SET_STEP', {
                currentStep: 3,
              });
            } else {
              console.log('not found');
              this.lookForIp();
            }
          });
      }, 10000);
    },
  },
  mounted() {
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

runcmd:
  - wget https://raw.githubusercontent.com/motioncrypto/motion-docs/master/scripts/masternode.sh
  - chmod +x masternode.sh
  - ./masternode.sh ${this.$store.state.Information.genkey} -y`,
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
          }, 240000);
        });
      })
      .then((response) => {
        this.dropletIp = response.data.droplet.networks.v4[0].ip_address;
        this.$store.commit('SET_IP', {
          ip: this.dropletIp,
        });
        this.lookForIp();
      })
      .catch((e) => {
        console.error('Error', e);
      });
  },
};
</script>
