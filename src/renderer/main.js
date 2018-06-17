import Vue from 'vue';
import axios from 'axios';
import vmodal from 'vue-js-modal';

import App from './App';
import router from './router';
import store from './store';

if (!process.env.IS_WEB) Vue.use(require('vue-electron'));
Vue.http = Vue.prototype.$http = axios;
Vue.config.productionTip = false;

const config = {
  apiKey: 'AIzaSyA7nyVTExF1TZ5qFqE8wN0RTPWdBZNPJz4',
  authDomain: 'motion-masternode-installer.firebaseapp.com',
  databaseURL: 'https://motion-masternode-installer.firebaseio.com',
  projectId: 'motion-masternode-installer',
  storageBucket: 'motion-masternode-installer.appspot.com',
  messagingSenderId: '661248216725',
};
window.firebase.initializeApp(config);

Vue.use(vmodal, { dialog: true });

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app');
