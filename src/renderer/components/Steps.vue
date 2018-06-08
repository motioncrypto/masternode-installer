<template>
  <div class="steps">
    <div class="step-container active">
      <div class="globe">1</div>
      Prepare
    </div>
    <div class="separation-line"></div>
    <div class="step-container" v-bind:class="{ active: currentStep>=2 }">
      <div class="globe">2</div>
      Install
    </div>
    <div class="separation-line"></div>
    <div class="step-container" v-bind:class="{ active: currentStep>=3 }">
      <div class="globe">3</div>
      Activate
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    currentStep() {
      return this.$store.state.Steps.currentStep;
    },
  },
};
</script>


<style lang="scss" scoped>
  .steps {
    display: grid;
    grid-template-columns: 1fr 3fr 1fr 3fr 1fr;
    position: fixed;
    bottom: 30px;
    width: 85%;
    margin: 0 auto;
  }
  .step-container {
    display: inline-block;
    text-align: center;

    .globe {
      height: 50px;
      width: 50px;
      border-radius: 50px;
      background-color: $brand-color-dark;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 10px;
      position: relative;
      z-index: 100;
    }

    &.active {
      .globe {
        background-color: $brand-color-light;
      }
    }
  }

  .separation-line {
    height: 1px;
    background-color: $brand-color-light;
    margin-top: 24px;
    width: 120%;
    position: relative;
    left: -10px;
  }
</style>
