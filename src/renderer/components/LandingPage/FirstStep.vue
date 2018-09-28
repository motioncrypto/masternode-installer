<template>
  <div id="first-step">
    <p>Currently you have: <span class="amount">{{Math.trunc(balance)}}</span>XMN</p>
    <p class="mt20" v-if="balance >= 1000.1">We can continue. <span v-if="(balance / 1000) >= 2"><b>You can install up to {{ Math.trunc(balance / 1000) }} Masternodes!</b></span></p>
    <p class="mt20" v-if="balance < 1000.1">We can't continue. You need at least 1000.1 XMN unlocked on your account.</p>
    <div class="separator"></div>
    <div v-if="balance >= 1000.1">
      <p>First, we need a good VPS:</p>
      <img src="~@/assets/digitalocean.png" class="do-logo" alt="DigitalOcean" />
      <ul class="buttons">
        <li>
          <button @click="openLink($event, 'https://cloud.digitalocean.com/v1/oauth/authorize?client_id=87717c90e37ca7553cedceaded7325b5a7b3c1c2cfed6a7e178c97ebe9779ccd&redirect_uri=https://9fk4ake7rk.execute-api.us-east-1.amazonaws.com/default/motionoAuthCallback&response_type=code&scope=read write')">Login</button>
        </li>
        <li>
          <button @click="openLink($event, 'https://m.do.co/c/7ef716d06656')">Signup</button>
        </li>
      </ul>
    </div>
    <div v-if="balance < 1000.1">
      <p>You can get more XMN from our <a href="https://motionproject.org/#exchanges" @click="openLink($event, 'https://motionproject.org/#exchanges')" target="_blank">supported exchanges</a>.</p>
    </div>
    <modal name="nodesqty" 
      :adaptive="true"
      :clickToClose="false"
      class="prompt"
      width="80%"
      height="30%">
      <div class="modal-container">
        <form @submit.prevent="settedNodesQty">
          <p>How many Masternodes do you want to install?:</p>
          <input type="number" step="1" min="1" :max="Math.trunc(balance / 1000)" v-model="masternodesToInstall" @blur="fixMaxInstallNumber()" />
          <button type="submit">Proceed</button>
        </form>
      </div>
    </modal>
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
          <button type="submit">Unlock</button>
        </form>
      </div>
    </modal>
  </div>
</template>

<script>
import { shell, ipcRenderer } from 'electron';
import os from 'os';
import fs from 'fs';
import axios from 'axios';
// import path from 'path';
const Client = require('motion-core');
const client = new Client({
  username: 'motion',
  password: '47VMxa7GvxKaV3J',
  port: 3385,
});

export default {
  data() {
    return {
      outputs: [],
      availableMasternodesToInstall: [],
      currentMasternodes: null,
      xmnaddresses: [],
      passphrase: '',
      incorrectPassphrase: false,
      masternodesToInstall: 1,
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
      shell.openExternal(encodeURI(link));
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
      axios.post('http://localhost:3385/', {
        jsonrpc: '1.0',
        method: 'masternode',
        params: ['outputs'],
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: 'motion',
          password: '47VMxa7GvxKaV3J',
        },
      }).then((response) => {
        // eslint-disable-next-line
        for (const key in response.data.result) {
          // eslint-disable-next-line
          if (response.data.result.hasOwnProperty(key)) {
            this.outputs.push({
              txid: key,
              txnumber: response.data.result[key],
            });
          }
        }

        if (this.outputs.length) {
          if (!this.currentMasternodes || !this.currentMasternodes.length) {
            this.currentMasternodes = [];
          }

          // this.availableMasternodesToInstall = this.outputs
          //   .filter(output => !this.currentMasternodes
          //     .find(masternode => masternode.txid === output.txid &&
          //       masternode.txnumber === output.txnumber));
          this.availableMasternodesToInstall = this.outputs
            .filter(this.comparer(this.currentMasternodes));

          // Double filtering with different methods. Removing duplicates.
          this.availableMasternodesToInstall = this.availableMasternodesToInstall
            .filter((masternode, index, self) =>
              index === self.findIndex(t => t.txid === masternode.txid &&
                t.txnumber === masternode.txnumber),
            );

          this.installMasternode();
        } else {
          this.installMasternode();
        }
      }).catch((error) => {
        console.error('Error getting the masternode outputs', error);
      });
    },
    comparer(otherArray) {
      return current => otherArray
        // eslint-disable-next-line
        .filter(other => other.txid == current.txid && other.txnumber == current.txnumber)
        .length === 0;
    },
    getOuputsFromTxId(txId) {
      this.availableMasternodesToInstall = [];
      // eslint-disable-next-line
      for (let i = 1; i <= Number(this.masternodesToInstall); i += 1) {
        this.availableMasternodesToInstall.push({
          txid: txId,
          txnumber: i,
        });
      }
      console.log('Outputs found', this.availableMasternodesToInstall);

      this.installMasternode();
    },
    installMasternode() {
      if (this.availableMasternodesToInstall &&
        this.availableMasternodesToInstall.length >= Number(this.masternodesToInstall)) {
        console.log('Awesome! we can install');
        console.log(this.availableMasternodesToInstall);
        // Get firsts available outputs
        const outputs = this.availableMasternodesToInstall.slice(0,
          Number(this.masternodesToInstall));
        this.$store.commit('SET_OUTPUTS', {
          outputs,
        });
        // Generate Privkeys
        const genkeysPromises = [];
        for (let i = 0; i < Number(this.masternodesToInstall); i += 1) {
          genkeysPromises.push(client.masternode('genkey'));
        }
        Promise.all(genkeysPromises)
          .then((genkeys) => {
            console.log('Genkeys generated', genkeys);
            this.$store.commit('SET_GENKEYS', {
              genkeys,
            });
            // Start Installation
            this.$store.commit('SET_STEP', {
              currentStep: 2,
            });
          });
      } else {
        console.log('not available masternodes');
        const accountsToGenerate = Number(this.masternodesToInstall);
        // Create new wallet
        client
          .getNewAddress(`${this.mnName}base`)
          .then((address) => {
            console.log('New Address Generated', address);
            console.log('accounts to generate', accountsToGenerate);
            const baseaddress = address;
            // Send 1000 XMN
            client
              .sendToAddress(baseaddress,
                accountsToGenerate === 1 ? 1000 : ((accountsToGenerate * 1000) + 1))
              .then((txid) => {
                console.log('basetxid', txid);
                if (accountsToGenerate === 1) {
                  // Restart Install Masternode
                  this.compareMasternodes();
                } else {
                  const generateAddressesArray = [];
                  for (let i = 0; i < accountsToGenerate; i += 1) {
                    generateAddressesArray.push(client.getNewAddress(`${this.mnName}-${i}`));
                  }
                  Promise.all(generateAddressesArray)
                    .then((wallets) => {
                      const sendAddresses = {};

                      wallets.forEach((wallet) => {
                        sendAddresses[wallet] = 1000;
                      });

                      client
                        .sendMany(`${this.mnName}base`, sendAddresses, 0)
                        .then((txid) => {
                          console.log('sendManyTxId', txid);
                          // Restart Install Masternode
                          this.getOuputsFromTxId(txid);
                        })
                        .catch((error) => {
                          console.error('Error sending mn funds', error);
                        });
                    })
                    .catch((error) => {
                      console.error('Error generating the mn wallets', error);
                    });
                }
              })
              .catch((error) => {
                console.log('Error sending funds to base address', error);
              });
          });
      }
    },
    readCurrentMasternodes(path) {
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
      let datadirPath = this.$store.state.Information.mnConfPath;

      if (fs.existsSync(`${datadirPath}/masternode.conf`)) {
        console.log('masternode.conf file found');
        this.readCurrentMasternodes(`${datadirPath}/masternode.conf`);
      } else {
        console.log('datadir', datadirPath);
        datadirPath = `${os.userInfo().homedir}/AppData/Roaming/MotionCore`;
        if (os.platform() === 'darwin') {
          datadirPath =
         `${os.userInfo().homedir}/Library/Application Support/MotionCore`;
        }
        if (os.platform() === 'linux') {
          datadirPath = `${os.userInfo().homedir}/.motioncore`;
        }
        if (fs.existsSync(`${datadirPath}/masternode.conf`)) {
          this.readCurrentMasternodes(`${datadirPath}/masternode.conf`);
        } else {
          console.error('Unable to reach the masternode.conf file');
        }
      }
    },
    checkForPassphrase() {
      client
        .getInfo()
        .then((info) => {
          if (Object.prototype.hasOwnProperty.call(info, 'unlocked_until')) {
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
    settedNodesQty() {
      this.$modal.hide('nodesqty');
      this.getCurrentMasternodes();
    },
    fixMaxInstallNumber() {
      if (this.masternodesToInstall > Math.trunc(this.balance / 1000)) {
        this.masternodesToInstall = Math.trunc(this.balance / 1000);
      }
    },
  },
  mounted() {
    this.checkForPassphrase();
    this.getCurrentBalance();
    this.mnName = `MN${Math.round(new Date().getTime() / 1000)}`;
    this.$store.commit('SET_MNNAME', {
      mnName: this.mnName,
    });
    // this.compareMasternodes();

    ipcRenderer.on('do-oauth-reply', (event, accessToken) => {
      this.$store.commit('SET_ACCESS_TOKEN', {
        accessToken,
      });
      if ((this.balance / 1000) >= 2) {
        console.log('This user can install more than 1 Masternode, ask how many want');
        this.$modal.show('nodesqty');
      } else {
        console.log('Try to install the masternode');
        this.getCurrentMasternodes();
      }
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
