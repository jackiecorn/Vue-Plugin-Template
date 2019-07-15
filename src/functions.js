export const isOverlapping = (text, background) => {
	background = {
		x: background.absoluteTransform[0][2],
		y: background.absoluteTransform[1][2],
		width: background.width,
		height: background.height,
		visible: background.visible
	};
	text = {
		x: text.absoluteTransform[0][2],
		y: text.absoluteTransform[1][2],
		width: text.width,
		height: text.height
	};
	return (
		background.visible === true &&
		background.x <= text.x + text.width &&
		background.x + background.width >= text.x &&
		background.y <= text.y + text.height &&
		background.y + background.height >= text.y
	);
};

export const isTextOnTop = (text, backgrounds) => {
	const overlappingBGs = backgrounds.filter(background => isOverlapping(text, background));
	return !overlappingBGs.some(overlappingBG => {
		if (
			overlappingBG.parent === text.parent &&
			overlappingBG.parent.children.indexOf(overlappingBG) > overlappingBG.parent.children.indexOf(text)
		)
			return true;
		if (
			overlappingBG.parent === text.parent &&
			overlappingBG.parent.children.indexOf(overlappingBG) < overlappingBG.parent.children.indexOf(text)
		)
			return false;
		if (overlappingBG.parent !== text.parent) {
			let bgDepth = 0;
			let textDepth = 0;
			const getDepth = function(node, depth) {
				if (node.parent === null) return depth;
				else {
					depth++;
					return getDepth(node.parent, depth);
				}
			};
			bgDepth = getDepth(overlappingBG, bgDepth);
			textDepth = getDepth(text, textDepth);

			const getTopParent = (a, b) => {
				if (a.parent === b.parent) return a;
				else {
					return getTopParent(a.parent, b);
				}
			};

			if (textDepth > bgDepth) {
				const textTopParent = getTopParent(text, overlappingBG);
				if (overlappingBG.parent.children.indexOf(overlappingBG) > overlappingBG.parent.children.indexOf(textTopParent))
					return true;
				if (overlappingBG.parent.children.indexOf(overlappingBG) < overlappingBG.parent.children.indexOf(textTopParent))
					return false;
			}
			if (textDepth < bgDepth) {
				const bgTopParent = getTopParent(overlappingBG, text);
				if (bgTopParent.parent.children.indexOf(bgTopParent) > bgTopParent.parent.children.indexOf(text)) return false;
				if (bgTopParent.parent.children.indexOf(bgTopParent) < bgTopParent.parent.children.indexOf(text)) return true;
			}
			if (textDepth === bgDepth) {
				const getTextTopParents = (a, b) => {
					if (a.parent === b.parent) return a.parent;
					else return getTopParent(a.parent, b.parent);
				};
				const getBGTopParents = (a, b) => {
					if (a.parent === b.parent) return a.parent;
					else return getTopParent(a.parent, b.parent);
				};
				const textTopParent = getTextTopParents(text, overlappingBG);
				const bgTopParent = getBGTopParents(text, overlappingBG);
				if (bgTopParent.parent.children.indexOf(bgTopParent) > bgTopParent.parent.children.indexOf(textTopParent))
					return true;
				if (bgTopParent.parent.children.indexOf(bgTopParent) < bgTopParent.parent.children.indexOf(textTopParent))
					return false;
			}
		}
	});
};

export const isTextVisible = node => {
	if (!node.visible) return false;
	else if (node.parent.type !== 'PAGE') return isTextVisible(node.parent);
	else return true;
};

export const rgba2rgb = (background, color, alpha) => {
	return {
		r: Math.floor((1 - alpha) * background.r * 255 + alpha * color.r * 255 + 0.5) / 255,
		g: Math.floor((1 - alpha) * background.g * 255 + alpha * color.g * 255 + 0.5) / 255,
		b: Math.floor((1 - alpha) * background.b * 255 + alpha * color.b * 255 + 0.5) / 255
	};
};
export const getTrueRGB = (text, bgColor) => {
	if (text.fills[0].opacity === 1 && text.opacity === 1) return text.fills[0].color;
	else if (text.fills[0].opacity !== 1 && text.opacity === 1)
		return rgba2rgb(bgColor, text.fills[0].color, text.fills[0].opacity);
	else if (text.fills[0].opacity === 1 && text.opacity !== 1)
		return rgba2rgb(bgColor, text.fills[0].color, text.opacity);
	else
		return rgba2rgb(
			bgColor,
			rgba2rgb(bgColor, rgba2rgb(bgColor, text.fills[0].color, text.fills[0].opacity), text.opacity)
		);
};

export const convertRGB = color => {
	if (color <= 0.04045) return color / 12.92;
	else return Math.pow((color + 0.055) / 1.055, 2.4);
};

export const getContrastRatio = (textColor, bgColor) => {
	var textLuminance =
		convertRGB(textColor.r) * 0.2126 + convertRGB(textColor.g) * 0.7152 + convertRGB(textColor.b) * 0.0722;
	var bgLuminance = convertRGB(bgColor.r) * 0.2126 + convertRGB(bgColor.g) * 0.7152 + convertRGB(bgColor.b) * 0.0722;
	var contrastRatio = (Math.max(textLuminance, bgLuminance) + 0.05) / (Math.min(textLuminance, bgLuminance) + 0.05);
	return parseFloat(contrastRatio.toFixed(2));
};
