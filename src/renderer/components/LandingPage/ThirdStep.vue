<template>
  <div id="step-three">
    <!-- <button @click="activateMasterNode()" :disabled="loading || finished">Activate your MasterNode</button>
    <div class="loading" v-if="loading">
      <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    </div> -->
    <h2>Your Masternode was setup successfully</h2>
    <p>Now just close installer and start alias from your wallet on Masternodes tab.</p>
    <div class="finished">
      <button @click="close()" v-if="finished" :disabled="!finished">Close</button>
    </div>
  </div>
</template>

<script>
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
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
      // loading: false,
      finished: true,
    };
  },
  computed: {
    mnName() {
      return this.$store.state.Information.mnName;
    },
    passphrase() {
      return this.$store.state.Wallet.passphrase;
    },
  },
  methods: {
    activateMasterNode() {
      client
        .masternode('start-alias', this.mnName)
        .then((response) => {
          if (response.errorMessage === 'Sync in progress. Must wait until sync is complete to start Masternode') {
            this.loading = true;
            setTimeout(() => {
              this.activateMasterNode();
            }, 5000);
          } else {
            this.loading = false;
            if (response.result === 'successful') {
              this.finished = true;
              // eslint-disable-next-line
              new window.Notification('Masternode Started', {
                body: 'Now just wait and enjoy your rewards.',
              });
            }
          }
        })
        .catch((error) => {
          if (error.code === -13) {
            client
              .walletPassphrase(this.passphrase, 5000)
              .then(() => {
                this.activateMasterNode();
              });
          }
        });
    },
    close() {
      const window = remote.getCurrentWindow();
      window.close();
    },
    restartDaemon() {
      client
        .stop()
        .then(() => {
          setTimeout(() => {
            execFile(`${path.join(__static, `/daemon/${os.platform()}/motiond`)}`, ['-daemon', '-rpcuser=motion', '-rpcpassword=47VMxa7GvxKaV3J']);
          }, 1000);
        });
    },
  },
  mounted() {
    // eslint-disable-next-line
    new window.Notification('Masternode Installed Successfully', {
      body: 'Now you only need to activate it.',
    });

    // this.restartDaemon();
  },
};
</script>


<style lang="scss" scoped>
.finished {
  margin-top: 50px;
  clear: both;
  text-align: center;
}

button {
  font-size: 1.2em;
  font-weight: lighter;
}

button[disabled] {
  opacity: 0.4;
}
</style>
