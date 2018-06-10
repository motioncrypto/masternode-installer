<template>
  <div id="wrapper">
    <img id="logo" src="~@/assets/logo.svg" alt="Motion">
    <h1 class="title">Masternode Installer</h1>
    <main>
      <div class="steps-content">
        <zero-step v-if="currentStep === 0 || !currentStep" />
        <first-step v-if="currentStep === 1" />
        <second-step v-if="currentStep === 2" />
        <third-step v-if="currentStep === 3" />
      </div>
      <steps v-if="balance >= 1000" />
    </main>
  </div>
</template>

<script>
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import { chmod } from 'fs';
import regedit from 'regedit';
import bplist from 'bplist-parser';
import ZeroStep from './LandingPage/ZeroStep';
import FirstStep from './LandingPage/FirstStep';
import SecondStep from './LandingPage/SecondStep';
import ThirdStep from './LandingPage/ThirdStep';
import Steps from './Steps';
const remote = require('electron').remote;

export default {
  name: 'landing-page',
  components: {
    ZeroStep,
    FirstStep,
    SecondStep,
    ThirdStep,
    Steps,
  },
  computed: {
    balance() {
      return this.$store.state.Wallet.balance;
    },
    currentStep() {
      return this.$store.state.Steps.currentStep;
    },
  },
  mounted() {
    chmod(`${path.join(__static, `/daemon/${os.platform()}/motiond${os.platform() === 'win32' ? '.exe' : ''}`).replace('app.asar', 'app.asar.unpacked')}`,
      '0777', (err) => {
        if (err) {
          console.log(err);
        }

        if (os.platform() === 'darwin') {
          bplist.parseFile(`${os.userInfo().homedir}/Library/Preferences/org.motion.Motion-Qt.plist`, (err, plistData) => {
            if (err) throw err;

            this.$store.commit('SET_MNCONFPATH', {
              mnConfPath: plistData[0].strDataDir,
            });
          });
        } else if (os.platform() === 'win32') {
          regedit.list('HKCU\\SOFTWARE\\MOTION\\MOTION-QT', (err, registryData) => {
            if (err) throw err;

            this.$store.commit('SET_MNCONFPATH', {
              mnConfPath: registryData[Object.keys(registryData)[0]].values.strDataDir.value,
            });
          });
        }

        execFile(`${path.join(__static, `/daemon/${os.platform()}/motiond`).replace('app.asar', 'app.asar.unpacked')}`,
          ['-rpcuser=motion', '-rpcpassword=47VMxa7GvxKaV3J'],
          (error, stdout, stderr) => {
            if (error) {
              console.log('Wallet is open');
              // eslint-disable-next-line
              new window.Notification('Your Motion Wallet should be closed', {
                body: 'Please close it and re-run the MasterNode Installer.',
              });

              setTimeout(() => {
                const window = remote.getCurrentWindow();
                window.close();
              }, 10000);
            }
            console.log(stderr);
            console.log(stdout);
          });
      });
  },
};
</script>

<style lang="scss">
  @import url('https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body { font-family: 'Open Sans', sans-serif; }

  #wrapper {
    background-color: $brand-color;
    height: 100vh;
    padding: 60px 40px;
    width: 100vw;
  }

  #logo {
    height: auto;
    margin-bottom: 20px;
    width: 80%;
    margin-left: auto;
    margin-right: auto;
    display: block;
  }

  h1.title {
    text-align: center;
    font-weight: lighter;
    font-size: 1.4em;
  }

  .steps-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
  }
</style>
