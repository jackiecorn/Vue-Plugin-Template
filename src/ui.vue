<template lang="pug">
div
	button.button.button--primary {{msg}}
</template>

<script>
import { dispatch, handleEvent } from "./uiMessageHandler";
import "./figma-ui/selectMenu";
import "./figma-ui/iconInput";
import "./figma-ui/disclosure";

export default {
  data() {
    return {
      stage: {},
      layer: new Konva.Layer(),
      markerLayer: new Konva.Layer(),
      markers: [],
      resizeRatio: 1,
      noResults: false
    };
  },
  mounted() {
    window.selectMenu.init();
    window.iconInput.init();
    window.disclosure.init();
  }
};
</script>

<style lang='scss'>
@import "./figma-ui/main";
</style>