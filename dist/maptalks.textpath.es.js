/*!
 * maptalks.textpath v0.1.0
 * LICENSE : MIT
 * (c) 2016-2018 maptalks.org
 */
/*!
 * requires maptalks@>=0.40.0 
 */
import { Canvas, LineString } from 'maptalks';

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

// https://github.com/Viglino/Canvas-TextPath
/** Render text along a path in a Canvas
*	Adds extra functionality to the CanvasRenderingContext2D by extending its prototype.
*	Extent the global object with options:
*		- textOverflow {undefined|visible|ellipsis|string} the text to use on overflow, default "" (hidden)
*		- textJustify {undefined|boolean} used to justify text (otherwise use textAlign), default false
*		- textStrokeMin {undefined|number} the min length (in pixel) for the support path to draw the text upon, default 0
* 
* @param {string} text the text to render
* @param {Array<Number>} path an array of coordinates as support for the text (ie. [x1,y1,x2,y2,...]
*/
(function () {
	/* Usefull function */
	function dist2D(x1, y1, x2, y2) {
		var dx = x2 - x1;
		var dy = y2 - y1;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/* Add new properties on CanvasRenderingContext2D */
	CanvasRenderingContext2D.prototype.textOverflow = "";
	CanvasRenderingContext2D.prototype.textJustify = false;
	CanvasRenderingContext2D.prototype.textStrokeMin = 0;

	var state = [];
	var save = CanvasRenderingContext2D.prototype.save;
	CanvasRenderingContext2D.prototype.save = function () {
		state.push({ textOverflow: this.textOverflow,
			textJustify: this.textJustify,
			textStrokeMin: this.textStrokeMin
		});
		save.call(this);
	};

	var restore = CanvasRenderingContext2D.prototype.restore;
	CanvasRenderingContext2D.prototype.restore = function () {
		restore.call(this);
		var s = state.pop();
		this.textOverflow = s.textOverflow;
		this.textJustify = s.textJustify;
		this.textStrokeMin = s.textStrokeMin;
	};

	/* textPath function */
	CanvasRenderingContext2D.prototype.textPath = function (text, path) {
		// Helper to get a point on the path, starting at dl 
		// (return x, y and the angle on the path)
		var di,
		    dpos = 0;
		var pos = 2;
		function pointAt(dl) {
			if (!di || dpos + di < dl) {
				for (; pos < path.length;) {
					di = dist2D(path[pos - 2], path[pos - 1], path[pos], path[pos + 1]);
					if (dpos + di > dl) break;
					pos += 2;
					if (pos >= path.length) break;
					dpos += di;
				}
			}

			var x,
			    y,
			    dt = dl - dpos;
			if (pos >= path.length) {
				pos = path.length - 2;
			}

			if (!dt) {
				x = path[pos - 2];
				y = path[pos - 1];
			} else {
				x = path[pos - 2] + (path[pos] - path[pos - 2]) * dt / di;
				y = path[pos - 1] + (path[pos + 1] - path[pos - 1]) * dt / di;
			}
			return [x, y, Math.atan2(path[pos + 1] - path[pos - 1], path[pos] - path[pos - 2])];
		}

		var letterPadding = this.measureText(" ").width * 0.25;

		// Calculate length
		var d = 0;
		for (var i = 2; i < path.length; i += 2) {
			d += dist2D(path[i - 2], path[i - 1], path[i], path[i + 1]);
		}
		if (d < this.minWidth) return;
		var nbspace = text.split(" ").length - 1;

		// Remove char for overflow
		if (this.textOverflow != "visible") {
			if (d < this.measureText(text).width + (text.length - 1 + nbspace) * letterPadding) {
				var overflow = this.textOverflow == "ellipsis" ? "\u2026" : this.textOverflow || "";
				var dt = overflow.length - 1;
				do {
					if (text[text.length - 1] === " ") nbspace--;
					text = text.slice(0, -1);
				} while (text && d < this.measureText(text + overflow).width + (text.length + dt + nbspace) * letterPadding);
				text += overflow;
			}
		}

		// Calculate start point
		var start = 0;
		switch (this.textJustify || this.textAlign) {case true: // justify
			case "center":
			case "end":
			case "right":
				{
					// Justify
					if (this.textJustify) {
						start = 0;
						letterPadding = (d - this.measureText(text).width) / (text.length - 1 + nbspace);
					}
					// Text align
					else {
							start = d - this.measureText(text).width - (text.length + nbspace) * letterPadding;
							if (this.textAlign == "center") start /= 2;
						}
					break;
				}
			// left
			default:
				break;
		}

		// Do rendering
		for (var t = 0; t < text.length; t++) {
			var letter = text[t];
			var wl = this.measureText(letter).width;

			var p = pointAt(start + wl / 2);

			this.save();
			this.textAlign = "center";
			this.translate(p[0], p[1]);
			this.rotate(p[2]);
			if (this.lineWidth > 0.1) this.strokeText(letter, 0, 0);
			this.fillText(letter, 0, 0);
			this.restore();
			start += wl + letterPadding * (letter == " " ? 2 : 1);
		}
	};
})();

function isSamePoint(pt1, pt2) {
	if (Math.abs(pt1.x - pt2.x) < 0.000001 && Math.abs(pt1.y - pt2.y) < 0.000001) return true;
	return false;
}

// remove duplicate adjacent point 
function delDuplicatePt(pts) {
	var i = 0;

	while (i < pts.length - 1) {
		if (isSamePoint(pts[i], pts[i + 1])) {
			pts.splice(i + 1, 1);
			continue;
		} else {
			i++;
		}
	}
	return pts;
}

var originPaintOn = LineString.prototype._paintOn;

var options = {
	fontSize: "48px",
	fontFamily: "Arial",
	textJustify: true,
	textOverflow: "visible",
	textBaseline: "middle",
	textStrokeMin: 5
};

var TextPath = function (_LineString) {
	_inherits(TextPath, _LineString);

	function TextPath() {
		_classCallCheck(this, TextPath);

		return _possibleConstructorReturn(this, _LineString.apply(this, arguments));
	}

	TextPath.prototype._paintOn = function _paintOn(ctx, points, lineOpacity, fillOpacity, dasharray) {
		//  paint smoothline error when adjacent-points duplicate

		var symbol = this.getSymbol();

		if (symbol && symbol['textPathSize']) {
			delDuplicatePt(points);

			var scale = this.getMap().getScale();
			var fontSize = parseInt(symbol['textPathSize'] / scale);
			if (fontSize < 3 || fontSize > 1000) return;
			fontSize += "px";

			var font = fontSize + " " + this.options["fontFamily"];
			this._paintPolylineTextPath(ctx, points, this.options['textName'], font, this.options["symbol"]['lineWidth'], lineOpacity);
		} else {
			originPaintOn.apply(this, arguments);
		}
	};

	TextPath.prototype._paintPolylineTextPath = function _paintPolylineTextPath(ctx, points, text, font, lineColor, lineOpacity) {
		// Render text
		ctx.font = font;
		ctx.strokeStyle = 'rgba(0,0,0,0)';
		ctx.lineWidth = 0;
		ctx.globalAlpha = lineOpacity;

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.textOverflow = "visible";
		ctx.textJustify = true;

		var path = [];
		var len = points.length;
		for (var i = 0; i < len; i++) {
			path.push(points[i].x);
			path.push(points[i].y);
		}

		ctx.beginPath();
		ctx.moveTo(path[0], path[1]);
		ctx.textPath(text, path);
		Canvas._stroke(ctx, lineOpacity);
	};

	return TextPath;
}(LineString);

TextPath.mergeOptions(options);

TextPath.registerJSONType('TextPath');

export { TextPath };
export default TextPath;

typeof console !== 'undefined' && console.log('maptalks.textpath v0.1.0, requires maptalks@>=0.40.0.');
