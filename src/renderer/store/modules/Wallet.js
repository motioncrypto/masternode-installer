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
};

export default {
  state,
  mutations,
  actions,
};
