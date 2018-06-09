<template>
  <div id="second-step">
    <h1>Syncing Wallet...</h1>
    <div class="loading">
      <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { setTimeout } from 'timers';
const remote = require('electron').remote;
const Client = require('motion-core');
const client = new Client({
  username: 'motion',
  password: '47VMxa7GvxKaV3J',
  port: 3385,
});

export default {
  data() {
    return {
      blockCount: 0,
    };
  },
  methods: {
    getBlockCount() {
      axios.get('https://explorer.motionproject.org/api/getblockcount')
        .then((response) => {
          this.blockCount = Number(response.data);
        });
    },
    checkIfWalletIsLoaded() {
      client
        .getBlockCount()
        .then((response) => {
          if (response >= this.blockCount) {
            console.log('synced');
            this.$store.commit('SET_STEP', {
              currentStep: 1,
            });
          } else {
            setTimeout(() => {
              this.checkIfWalletIsLoaded();
            }, 3000);
          }
        })
        .catch(() => {
          setTimeout(() => {
            this.checkIfWalletIsLoaded();
          }, 3000);
        });
    },
    checkIfWalletIsAlreadyRunning() {
      setTimeout(() => {
        client
          .getInfo()
          .then((response) => {
            console.log(response);
            this.getBlockCount();
            this.checkIfWalletIsLoaded();
          })
          .catch((error) => {
            console.log(error);
            if (error.code === 401) {
              // eslint-disable-next-line
              new window.Notification('Your Motion Wallet should be closed', {
                body: 'Please close it and re-run the MasterNode Installer.',
              });

              setTimeout(() => {
                const window = remote.getCurrentWindow();
                window.close();
              }, 10000);
            } else {
              setTimeout(() => {
                this.checkIfWalletIsAlreadyRunning();
              }, 1000);
            }
          });
      }, 10000);
    },
  },
  mounted() {
    this.checkIfWalletIsAlreadyRunning();
  },
};
</script>
