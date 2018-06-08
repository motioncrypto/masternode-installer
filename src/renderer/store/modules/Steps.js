const state = {
  currentStep: 0,
};

const mutations = {
  SET_STEP(state, payload) {
    state.currentStep = payload.currentStep;
  },
};

export default {
  state,
  mutations,
};
