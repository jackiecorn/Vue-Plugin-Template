import { dispatch, handleEvent } from './codeMessageHandler';
import { isTextOnTop, isTextVisible } from './functions.js';

const selection = figma.currentPage.selection[0] as FrameNode;
const clipsContent = selection.clipsContent;
if (!clipsContent) selection.clipsContent = true;
const texts = selection.findAll(
	node => node.type === 'TEXT' && node.visible && typeof node.fills !== 'symbol'
) as Array<TextNode>;
const backgrounds = selection.findAll(
	node =>
		node.type === 'RECTANGLE' ||
		node.type === 'VECTOR' ||
		node.type === 'FRAME' ||
		node.type === 'COMPONENT' ||
		node.type === 'INSTANCE'
);

(async () => {
	const imageBuffer = await selection.exportAsync({ format: 'PNG', contentsOnly: false });
	figma.showUI(__html__, { width: selection.width, height: selection.height, visible: false });
	dispatch('image', {
		image: imageBuffer,
		width: selection.width,
		height: selection.height,
		frame: {
			absoluteTransform: selection.absoluteTransform,
			width: selection.width,
			height: selection.height
		},
		texts: texts.map(text => {
			return {
				id: text.id,
				absoluteTransform: text.absoluteTransform,
				width: text.width,
				height: text.height,
				fills: text.fills,
				opacity: text.opacity,
				fontSize: text.fontSize,
				visible: text.visible,
				fontName: text.fontName,
				characters: text.characters,
				name: text.name
			};
		})
	});
	return null;
})();

handleEvent('inaccessibleTexts', data => {
	if (!clipsContent) selection.clipsContent = false;
	data = data.map(text => {
		text.node = figma.getNodeById(text.id);
		return text;
	});
	data = data.filter(text => isTextVisible(text.node));
	// const inaccessibleTexts = data.filter(text => isTextOnTop(text.node, backgrounds));
	const inaccessibleTexts = data;
	const markers = inaccessibleTexts.map(text => {
		return {
			id: text.id,
			x: text.x - 4,
			y: text.y - 4,
			width: text.node.width + 8,
			height: text.node.height + 8,
			textColor: text.node.fills[0].color,
			bgColor: text.bgColor,
			contrastRatio: text.contrastRatio,
			fontSize: text.node.fontSize
		};
	});
	dispatch('markers', markers);
	figma.ui.show();
});

handleEvent('resize', data => {
	const { width, height } = data;
	let resizeRatio = 1;
	if (selection.width > selection.height) {
		if (selection.height > height - 60) {
			resizeRatio = height / selection.height;
		}
	} else {
		if (selection.width > width - 60) {
			resizeRatio = width / selection.width;
		}
	}
	const newWidth = Math.ceil(selection.width * resizeRatio);
	const newHeight = Math.ceil(selection.height * resizeRatio);
	dispatch('resize', {
		resizeRatio: resizeRatio,
		width: newWidth,
		height: newHeight
	});
	figma.ui.resize(newWidth, newHeight);
});

handleEvent('selectNode', id => {
	const node = figma.currentPage.findOne(node => node.id === id);
	if (node) {
		figma.currentPage.selection = [node];
		figma.viewport.scrollAndZoomIntoView([node]);
		figma.closePlugin();
	}
});

handleEvent('noResults', () => {
	figma.ui.resize(300, 60);
	figma.ui.show();
});

handleEvent('close', () => {
	figma.closePlugin();
});
