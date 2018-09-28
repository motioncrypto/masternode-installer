const state = {
  accessToken: null,
  genkeys: [],
  outputs: [],
  ip: null,
  mnName: null,
  mnConfPath: null,
};

const mutations = {
  SET_ACCESS_TOKEN(state, payload) {
    state.accessToken = payload.accessToken;
  },
  SET_GENKEYS(state, payload) {
    state.genkeys = payload.genkeys;
  },
  SET_OUTPUTS(state, payload) {
    state.outputs = payload.outputs;
  },
  SET_IP(state, payload) {
    state.ip = payload.ip;
  },
  SET_MNNAME(state, payload) {
    state.mnName = payload.mnName;
  },
  SET_MNCONFPATH(state, payload) {
    state.mnConfPath = payload.mnConfPath;
  },
};

export default {
  state,
  mutations,
};
