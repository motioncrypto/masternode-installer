const state = {
  balance: 0,
  passphrase: null,
};

const mutations = {
  SET_BALANCE(state, payload) {
    state.balance = payload.balance;
  },
  SET_PASSPHRASE(state, payload) {
    state.passphrase = payload.passphrase;
  },
};

const actions = {
  // getUser(commit, state) {
  //   return new Promise((resolve, reject) => {
  //     getAxiosClient(state).get('/user').then(response => {
  //       commit(types.SET_USER, response.data);
  //       resolve(response.data);
  //     }, err => {
  //       console.log(err);
  //       reject(err);
  //     });
  //   });
  // },
};

export default {
  state,
  mutations,
  actions,
};
