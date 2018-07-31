<template>
  <div id="first-step">
    <p>Currently you have: <span class="amount">{{Math.floor(balance)}}</span>XMN</p>
    <p class="mt20" v-if="balance >= 1000">We can continue.</p>
    <p class="mt20" v-if="balance < 1000">We can't continue. You need at least 1000.1 XMN unlocked on your account.</p>
    <div class="separator"></div>
    <div v-if="balance >= 1000.1">
      <p>First, we need a good VPS:</p>
      <img src="~@/assets/digitalocean.png" class="do-logo" alt="DigitalOcean" />
      <ul class="buttons">
        <li>
          <button @click="loginWithDigitalOcean()">Login</button>
        </li>
        <li>
          <button @click="openLink($event, 'https://m.do.co/c/7ef716d06656')">Signup</button>
        </li>
      </ul>
    </div>
    <div v-if="balance < 1000.1">
      <p>You can get more XMN from our <a href="https://motionproject.org/#exchanges" @click="openLink($event, 'https://motionproject.org/#exchanges')" target="_blank">supported exchanges</a>.</p>
    </div>
    <modal name="passphrase" 
      :adaptive="true"
      :clickToClose="false"
      class="prompt"
      width="80%"
      height="30%">
      <div class="modal-container" v-bind:class="{ error: incorrectPassphrase }">
        <form @submit.prevent="unlockWallet">
          <p>We need to unlock your wallet, please input your Passphrase:</p>
          <input type="password" v-model="passphrase" />
          <button type="submit" @click="unlockWallet">Unlock</button>
        </form>
      </div>
    </modal>
  </div>
</template>

<script>
import { shell, ipcRenderer } from 'electron';
// import os from 'os';
import fs from 'fs';
// import path from 'path';
import VueCircle from 'vue2-circle-progress';
import opn from 'opn';
import { setTimeout } from 'timers';
const { dialog } = require('electron').remote;
const Client = require('motion-core');
const client = new Client({
  username: 'motion',
  password: '47VMxa7GvxKaV3J',
  port: 3385,
});

export default {
  components: {
    VueCircle,
  },
  data() {
    return {
      outputs: [],
      availableMasternodesToInstall: [],
      currentMasternodes: null,
      xmnaddress: null,
      passphrase: '',
      incorrectPassphrase: false,
    };
  },
  computed: {
    balance() {
      return this.$store.state.Wallet.balance;
    },
  },
  methods: {
    openLink($event, link) {
      $event.preventDefault();
      shell.openExternal(link);
    },
    getCurrentBalance() {
      client
        .listUnspent()
        .then((unspent) => {
          let balance = 0;
          unspent
            .filter(tx => tx.spendable)
            .forEach((tx) => {
              balance += tx.amount;
            });
          this.$store.commit('SET_BALANCE', {
            balance,
          });
        });
    },
    compareMasternodes() {
      client
        .masternode('outputs')
        .then((response) => {
          // eslint-disable-next-line
          for (const key in response) {
            // eslint-disable-next-line
            if (response.hasOwnProperty(key)) {
              this.outputs.push({
                txid: key,
                txnumber: response[key],
              });
            }
          }

          if (this.outputs.length) {
            if (!this.currentMasternodes || !this.currentMasternodes.length) {
              this.currentMasternodes = [];
            }

            this.availableMasternodesToInstall = this.outputs
              .filter(output => !this.currentMasternodes
                .find(masternode => masternode.txid === output.txid));

            this.installMasternode();
          } else {
            this.installMasternode();
          }
        });
    },
    installMasternode() {
      if (this.availableMasternodesToInstall.length) {
        // Get first available output
        const output = this.availableMasternodesToInstall[0];
        this.$store.commit('SET_OUTPUT', {
          output,
        });
        // Generate Privkey
        client
          .masternode('genkey')
          .then((genkey) => {
            this.$store.commit('SET_GENKEY', {
              genkey,
            });
            // Start Installation
            this.$store.commit('SET_STEP', {
              currentStep: 2,
            });
          });
      } else {
        console.log('not available masternodes');
        // Create new wallet
        client
          .getNewAddress(this.mnName)
          .then((address) => {
            console.log('New Address Generated', address);
            this.xmnaddress = address;
            // Send 1000 XMN
            client
              .sendToAddress(this.xmnaddress, 1000)
              .then((txid) => {
                console.log('txid', txid);
                // Restart Install Masternode
                this.compareMasternodes();
              });
          });
      }
    },
    readCurrentMasternodes(path) {
      this.$store.commit('SET_MNCONFPATH', {
        mnConfPath: path,
      });
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) throw err;
        const lines = data.split('\n');
        this.currentMasternodes = lines
          .filter(line => line[0] !== '#')
          .map((line) => {
            const parts = line.split(' ');
            return {
              name: parts[0],
              ip: parts[1],
              privkey: parts[2],
              txid: parts[3],
              txnumber: parts[4],
            };
          });

        console.log('current masternodes', this.currentMasternodes);

        this.compareMasternodes();
      });
    },
    getCurrentMasternodes() {
      let datadirPath = `${this.$store.state.Information.mnConfPath}/masternode.conf`;
      // let datadirPath = `${os.userInfo().homedir}/AppData/Roaming/MotionCore/masternode.conf`;
      // if (os.platform() === 'darwin') {
      //   datadirPath =
      //  `${os.userInfo().homedir}/Library/Application Support/MotionCore/masternode.conf`;
      // }
      // if (os.platform() === 'linux') {
      //   datadirPath = `${os.userInfo().homedir}/.motioncore/masternode.conf`;
      // }

      if (fs.existsSync(datadirPath)) {
        console.log('masternode.conf file found');
        this.readCurrentMasternodes(datadirPath);
      } else {
        console.log('datadir', datadirPath);
        // eslint-disable-next-line
        new window.Notification('Motion Datadir is not the default one', {
          body: 'Please select your Motion Datadir manually',
        });
        setTimeout(() => {
          datadirPath = dialog.showOpenDialog({
            properties: ['openDirectory'],
          });
        }, 1000);
        if (fs.existsSync(`${datadirPath}/masternode.conf`)) {
          this.$store.commit('SET_MNCONFPATH', {
            mnConfPath: datadirPath,
          });
          this.readCurrentMasternodes(datadirPath);
        } else {
          this.getCurrentMasternodes();
        }
      }
    },
    checkForPassphrase() {
      client
        .getInfo()
        .then((info) => {
          if (Object.prototype.hasOwnProperty.call(info, 'unlocked_until')) {
            // userPrompt('First, we need to unlock your wallet, please input your Passphrase:',
            //   'Your Passphrase', path.join(__static, '/icons/256x256.png'))
            //   .then((input) => {
            //     if (!input) {
            //       this.checkForPassphrase();
            //     } else {
            //       client
            //         .walletPassphrase(input, 5000)
            //         .then(() => {
            //           this.$store.commit('SET_PASSPHRASE', {
            //             passphrase: input,
            //           });
            //         })
            //         .catch((error) => {
            //           if (error.code === -14) {
            //             this.checkForPassphrase();
            //           }
            //         });
            //     }
            //   })
            //   .catch((err) => {
            //     console.log(err);
            //   });
            this.$modal.show('passphrase');
          }
        });
    },
    unlockWallet() {
      this.incorrectPassphrase = false;
      client
        .walletPassphrase(this.passphrase, 5000)
        .then(() => {
          this.$store.commit('SET_PASSPHRASE', {
            passphrase: this.passphrase,
          });
          this.$modal.hide('passphrase');
        })
        .catch((error) => {
          if (error.code === -14) {
            this.incorrectPassphrase = true;
          }
        });
    },
    loginWithDigitalOcean() {
      // ipcRenderer.send('do-oauth', 'getToken');
      opn('https://cloud.digitalocean.com/v1/oauth/authorize?client_id=643548bb6989b2d7440fc1918f386541b8a43b3baeebcd008b331ee04d4f8d76&redirect_uri=https://us-central1-motion-masternode-installer.cloudfunctions.net/oauthCallback&response_type=code&scope=read write');
    },
  },
  mounted() {
    this.checkForPassphrase();
    this.getCurrentBalance();
    this.mnName = `MN${Math.round(new Date().getTime() / 1000)}`;
    this.$store.commit('SET_MNNAME', {
      mnName: this.mnName,
    });

    ipcRenderer.on('do-oauth-reply', (event, accessToken) => {
      this.$store.commit('SET_ACCESS_TOKEN', {
        accessToken,
      });
      this.getCurrentMasternodes();
    });
  },
};
</script>

<style lang="scss" scoped>
#first-step {
  margin-top: 30px;
  width: 90%;
}

p {
  font-weight: normal;

  span.amount {
    font-weight: lighter;
    margin-left: 40px;
  }
}

.do-logo {
  margin: 60px auto 20px;
  display: block;
}

ul.buttons {
  list-style: none;
  margin: 50px auto;
  text-align: center;

  li {
    display: inline-block;
    margin-right: 50px;

    &:last-child {
      margin-right: 0;
    }
  }
}
</style>

<style lang="scss">
.v--modal {
  background-color: #1E8DE0 !important;
  box-shadow: 0 20px 60px -2px rgba(27, 33, 58, 0.58);
}

.v--modal-box {
  background-color: #1E8DE0 !important;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  p {
    color: #fff;
  }

  .modal-container {
    width: 80%;
    margin: 0 auto;

    p {
      margin-bottom: 20px;
    }

    input {
      width: 100%;
      height: 30px;
      border-radius: 5px;
      border: none;
      background-color: #fff;
      margin-bottom: 20px;
      padding-left: 10px;
      padding-right: 10px;
    }

    &.error {
      animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      perspective: 1000px;
    }

    button {
      background-color: #001B38;
      margin: 0 auto;
      display: block;

      &:hover {
        background-color: darken(#001B38, 10%);
      }
    }
  }
}
@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }

  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
