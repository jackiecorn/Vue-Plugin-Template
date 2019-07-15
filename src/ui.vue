<template lang="pug">
#app(:class='{noResults: noResults}' @click='close')
	#stage(v-if='!noResults')
	v-popover(v-for='marker in markers' :key='marker.id' trigger='hover' placement='auto' :style='{position: "absolute", top: marker.y * resizeRatio, left: marker.x * resizeRatio, width: marker.width * resizeRatio, height: marker.height * resizeRatio}')
		.marker(@click='selectNode(marker.id)')
		template(slot="popover")
			p Contrast ratio:  {{marker.contrastRatio.toString()}}
			p Font size: {{marker.fontSize.toString()}}px
			p AA:  {{marker.contrastRatio >= 3 && marker.fontSize > 19 ? 'Pass' : 'Fail'}}
			p AAA:  {{marker.contrastRatio >= 4.5 ? 'Pass' : 'Fail'}}
	#noResults(v-if='noResults')
		svg.checkmark(xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24")
			path(d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z")
		.successText All texts meet AAA color contrast requirements
</template>

<script>
import { dispatch, handleEvent } from "./uiMessageHandler";
import {
  rgba2rgb,
  getTrueRGB,
  convertRGB,
  getContrastRatio
} from "./functions.js";
const Konva = require("konva");

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
    handleEvent("image", data => {
      const { image, width, height, frame, texts } = data;
      this.stage = new Konva.Stage({
        container: "stage",
        width: width,
        height: height
      });
      const imageObj = new Image();
      imageObj.onload = () => {
        const image = new Konva.Image({
          x: 0,
          y: 0,
          image: imageObj,
          width: width,
          height: height
        });
        this.layer.add(image);
        this.stage.add(this.layer);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageObj, 0, 0);
        this.analyze(ctx, frame, texts);
      };
      imageObj.src = URL.createObjectURL(
        new Blob([image], { type: "image/png" })
      );
    });

    handleEvent("markers", data => {
      this.markers = data;
      for (let marker of data) {
        this.markerLayer.add(
          new Konva.Rect({
            x: marker.x,
            y: marker.y,
            width: marker.width,
            height: marker.height,
            stroke: "#F24822",
            cornerRadius: 2,
            strokeWidth: 2
          })
        );
      }
      this.stage.add(this.markerLayer);
      dispatch("resize", { width: innerWidth, height: innerHeight });
    });

    handleEvent("resize", data => {
      const { resizeRatio, width, height } = data;
      this.resizeRatio = resizeRatio;
      this.layer.scale({ x: resizeRatio, y: resizeRatio });
      this.markerLayer.scale({ x: resizeRatio, y: resizeRatio });
      this.stage.width(width);
      this.stage.height(height);
    });
  },
  methods: {
    analyze(ctx, frame, texts) {
      let inaccessibleTexts = [];
      for (let text of texts) {
        const textX =
          text.absoluteTransform[0][2] - frame.absoluteTransform[0][2];
        const textY =
          text.absoluteTransform[1][2] - frame.absoluteTransform[1][2];
        const bgPixels = {
          TL: ctx.getImageData(
            textX <= 0 ? 1 : textX - 1,
            textY <= 0 ? 1 : textY - 1,
            1,
            1
          ).data,
          TR: ctx.getImageData(
            textX >= frame.width ? frame.width - 1 : textX + text.width + 1,
            textY <= 0 ? textY : textY + 1,
            1,
            1
          ).data,
          BL: ctx.getImageData(
            textX <= 0 ? 1 : textX - 1,
            textY + text.height >= frame.height
              ? frame.height - 1
              : textY + text.height + 1,
            1,
            1
          ).data,
          BR: ctx.getImageData(
            textX + text.width >= frame.width
              ? frame.width - 1
              : textX + text.width + 1,
            textY + text.height >= frame.height
              ? frame.height - 1
              : textY + text.height + 1,
            1,
            1
          ).data
        };
        let textColor, bgColor, contrastRatio;
        const allBGSame = Object.values(bgPixels).every(
          (val, i, arr) => JSON.stringify(val) === JSON.stringify(arr[0])
        );
        if (allBGSame) {
          bgColor = {
            r: bgPixels.TL[0] / 255,
            g: bgPixels.TL[1] / 255,
            b: bgPixels.TL[2] / 255,
            a: 1
          };
          textColor = getTrueRGB(text, bgColor);
          contrastRatio = getContrastRatio(textColor, bgColor);
        } else {
          const bgColors = [
            {
              r: bgPixels.TL[0] / 255,
              g: bgPixels.TL[1] / 255,
              b: bgPixels.TL[2] / 255,
              a: 1
            },
            {
              r: bgPixels.TR[0] / 255,
              g: bgPixels.TR[1] / 255,
              b: bgPixels.TR[2] / 255,
              a: 1
            },
            {
              r: bgPixels.BL[0] / 255,
              g: bgPixels.BL[1] / 255,
              b: bgPixels.BL[2] / 255,
              a: 1
            },
            {
              r: bgPixels.BR[0] / 255,
              g: bgPixels.BR[1] / 255,
              b: bgPixels.BR[2] / 255,
              a: 1
            }
          ];
          const contrastRatios = bgColors.map(thisBgColor => {
            const thisTextColor = getTrueRGB(text, thisBgColor);
            return getContrastRatio(thisTextColor, thisBgColor);
          });
          contrastRatio = Math.min(...contrastRatios);
          bgColor = bgColors[contrastRatios.indexOf(contrastRatio)];
          textColor = getTrueRGB(text, bgColor);
        }
        if (contrastRatio < 4.5) {
          const inaccessibleText = {
            id: text.id,
            x: textX,
            y: textY,
            bgColor: bgColor,
            contrastRatio: contrastRatio
          };
          inaccessibleTexts.push(inaccessibleText);
        }
      }
      if (inaccessibleTexts.length > 0) {
        dispatch("inaccessibleTexts", inaccessibleTexts);
      } else {
        this.noResults = true;
        dispatch("noResults");
      }
    },
    selectNode(id) {
      dispatch("selectNode", id);
    },
    close() {
      if (this.noResults) dispatch("close");
    }
  }
};
</script>

<style lang='scss'>
* {
  cursor: default;
  user-select: none;
  margin: 0;
  -webkit-font-smoothing: antialiased;
  font: normal normal 400 11px/15px Inter, Roboto, sans-serif;
  outline: none;
}

body {
  margin: 0;
}
#app {
  position: relative;
}

.noResults {
  position: absolute;
  height: 100%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: -8px;
}

.noResults .konvajs-content {
  display: none;
}

#noResults {
  display: flex;
  align-items: center;
}

.checkmark {
  fill: #1bc47d;
  height: 12px;
}

.successText {
  margin-left: 4px;
}

.trigger,
.marker {
  width: 100%;
  height: 100%;
}

.tooltip,
.popover {
  display: block !important;
  z-index: 10000;
  color: white;
  .tooltip-inner,
  .popover-inner {
    background: #050505;
    color: white;
    border-radius: 2px;
    padding: 6px 8px;
  }
  .tooltip-arrow,
  .popover-arrow {
    width: 0;
    height: 0;
    border-style: solid;
    position: absolute;
    margin: 5px;
    border-color: #050505;
    z-index: 1;
  }
  &[x-placement^="top"] {
    margin-bottom: 5px;
    .tooltip-arrow,
    .popover-arrow {
      border-width: 5px 5px 0 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      bottom: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }
  &[x-placement^="bottom"] {
    margin-top: 5px;
    .tooltip-arrow,
    .popover-arrow {
      border-width: 0 5px 5px 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-top-color: transparent !important;
      top: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }
  &[x-placement^="right"] {
    margin-left: 5px;
    .tooltip-arrow,
    .popover-arrow {
      border-width: 5px 5px 5px 0;
      border-left-color: transparent !important;
      border-top-color: transparent !important;
      border-bottom-color: transparent !important;
      left: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }
  &[x-placement^="left"] {
    margin-right: 5px;
    .tooltip-arrow,
    .popover-arrow {
      border-width: 5px 0 5px 5px;
      border-top-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      right: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }
  &[aria-hidden="true"] {
    visibility: hidden;
    opacity: 0;
  }
  &[aria-hidden="false"] {
    visibility: visible;
    opacity: 1;
  }
}
</style>