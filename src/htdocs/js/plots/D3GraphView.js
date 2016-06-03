'use strict';

var d3 = require('d3'),
    Model = require('mvc/Model'),
    Util = require('util/Util'),
    View = require('mvc/View');


/**
 * Base class for D3 plotting.
 *
 * Creates svg element, setting viewBox to width and height.
 * Padding and margin are subtracted from the viewBox.
 *
 * Creates an svg:rect with class "outer-frame" inside margin.
 * Creates an svg:rect with class "inner-frame" inside padding.
 * Creates an svg:text with class "plot-title" centered at top of plot area.
 * Creates an svg:g with class "plot-area" for ploting.
 * Sets properties for subclass use during render:
 *     D3GraphView.height {Number}
 *                        height of plotArea.
 *     D3GraphView.plotArea {SVGElement}
 *                          plot area for graph.
 *     D3GraphView.width {Number}
 *                       width of plotArea.
 *
 * @param options {Object}
 *        all options are passed to View.
 * @param options.data {?}
 *        data to plot, for use by subclasses.
 * @param options.height {Number}
 *        default 500.
 *        height of svg viewBox.
 * @param options.marginBottom {Number}
 *        default 0.
 * @param options.marginLeft {Number}
 *        default 0.
 * @param options.marginRight {Number}
 *        default 0.
 * @param options.marginTop {Number}
 *        default 0.
 * @param options.paddingBottom {Number}
 *        default 75.
 * @param options.paddingLeft {Number}
 *        default 100.
 * @param options.paddingRight {Number}
 *        default 5.
 * @param options.paddingTop {Number}
 *        default 50.
 * @param options.title {String}
 *        title for plot.
 * @param options.tooltipOffset {Number}
 *        default 10.
 *        x/y distance from tooltip coordinate.
 * @param options.tooltipPadding {Number}
 *        default 5.
 *        padding around tooltip content.
 * @param options.width {Number}
 *        default 960.
 *        width of svg viewBox.
 * @param options.xAxisFormat {Function|String}
 *        default null.
 *        x axis tickFormat.
 * @param options.xAxisLabel {String}
 *        label for x axis.
 * @param options.xAxisScale {d3.scale}
 *        default d3.scale.linear().
 * @param options.xAxisTicks {Function(extent)|Array<Number>}
 *        default null.
 *        x axis tick values.
 * @param options.yAxisFormat {Function|String}
 *        default null.
 *        y axis tickFormat.
 * @param options.yAxisLabel {String}
 *        label for y axis.
 * @param options.yAxisScale {d3.scale}
 *        default d3.scale.linear().
 * @param options.yAxisTicks {Function(extent)|Array<Number>}
 *        default null.
 *        y axis tick values.
 */
var D3GraphView = function (options) {
  var _this,
      _initialize,

      _innerFrame,
      _margin,
      _outerFrame,
      _padding,
      _plotAreaClip,
      _plotTitle,
      _svg,
      _tooltip,
      _xAxis,
      _xAxisEl,
      _xAxisLabel,
      _xEl,
      _yAxis,
      _yAxisEl,
      _yAxisLabel,
      _yEl;

  _this = View(options);

  _initialize = function (options) {
    var el;

    _this.model.set(Util.extend({
      data: null,
      height: 500,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      marginTop: 0,
      paddingBottom: 75,
      paddingLeft: 100,
      paddingRight: 5,
      paddingTop: 50,
      pointRadius: 3,
      title: '',
      tooltipOffset: 10,
      tooltipPadding: 5,
      width: 960,
      xAxisFormat: null,
      xAxisLabel: '',
      xAxisScale: d3.scale.linear(),
      xAxisTicks: null,
      xExtent: null,
      yAxisFormat: null,
      yAxisLabel: '',
      yAxisScale: d3.scale.linear(),
      yAxisTicks: null,
      yDomainPadding: 0.1,
      yExtent: null
    }, _this.model.get(), options), {silent: true});

    el = _this.el;
    el.innerHTML = '<div class="graph">' +
          '<svg xmlns="http://www.w3.org/2000/svg" class="D3GraphView">' +
            '<defs>' +
              '<clipPath id="plotAreaClip">' +
                '<rect x="0" y="0"></rect>' +
              '</clipPath>' +
            '</defs>' +
            '<g class="margin">' +
              '<rect class="outer-frame"></rect>' +
              '<text class="plot-title" text-anchor="middle"></text>' +
              '<g class="padding">' +
                '<rect class="inner-frame"></rect>' +
                '<g class="x">' +
                  '<g class="axis"></g>' +
                  '<text class="label" text-anchor="middle"></text>' +
                '</g>' +
                '<g class="y">' +
                  '<g class="axis"></g>' +
                  '<text class="label" text-anchor="middle"' +
                      ' transform="rotate(-90)"></text>' +
                '</g>' +
                '<g class="data"></g>' +
                '<g class="tooltip"></g>' +
              '</g>' +
            '</g>' +
          '</svg>' +
        '</div>' +
        '<div class="controls"></div>';

    _svg = el.querySelector('svg');
    _plotAreaClip = _svg.querySelector('#plotAreaClip > rect');
    _outerFrame = _svg.querySelector('.outer-frame');
    _innerFrame = _svg.querySelector('.inner-frame');
    _margin = _svg.querySelector('.margin');
    _plotTitle = _margin.querySelector('.plot-title');
    _padding = _margin.querySelector('.padding');
    _xEl = _padding.querySelector('.x');
    _xAxisEl = _xEl.querySelector('.axis');
    _xAxisLabel = _xEl.querySelector('.label');
    _yEl = _padding.querySelector('.y');
    _yAxisEl = _yEl.querySelector('.axis');
    _yAxisLabel = _yEl.querySelector('.label');
    _tooltip = _padding.querySelector('.tooltip');

    _this.dataEl = _padding.querySelector('.data');

    _xAxis = d3.svg.axis().orient('bottom').outerTickSize(0);
    _yAxis = d3.svg.axis().orient('left').outerTickSize(0);

    _this.plotModel = options.plotModel || Model();
    _this.plotModel.on('change', _this.renderZoom);

    _this.zoom = d3.behavior.zoom()
        .scaleExtent([1, 50])
        .on('zoom', _this.onZoom);
    _this.zoom.el = d3.select(_innerFrame);
    _this.zoom.el.call(_this.zoom);
  };

  /**
   * Destroy this view.
   */
  _this.destroy = Util.compose(function () {
    _this.zoom.on('zoom', null);
    _this.zoom.el.on('mousedown.zoom', null);
    _this.zoom.el.on('mousemove.zoom', null);
    _this.zoom.el.on('dblclick.zoom', null);
    _this.zoom.el.on('touchstart.zoom', null);
    _this.zoom.el.on('wheel.zoom', null);
    _this.zoom.el.on('mousewheel.zoom', null);
    _this.zoom.el.on('MozMousePixelScroll.zoom', null);
    _this.zoom.el = null;

    _this.plotModel.off('change', _this.renderZoom);

    _innerFrame = null;
    _margin = null;
    _outerFrame = null;
    _padding = null;
    _plotAreaClip = null;
    _plotTitle = null;
    _svg = null;
    _tooltip = null;
    _xAxis = null;
    _xAxisEl = null;
    _xAxisLabel = null;
    _xEl = null;
    _yAxis = null;
    _yAxisEl = null;
    _yAxisLabel = null;
    _yEl = null;

    _initialize = null;
    _this = null;
  }, _this.destroy);


  /**
   * Format tooltip content.
   *
   * @param el {D3Element}
   *        tooltip container element.
   * @param data {Array<Object|Array>}
   *        data passed to showTooltip.
   *        this implementation expects objects (or arrays of objects):
   *        obj.class {String} class attribute for text|tspan.
   *        obj.text {String} content for text|tspan.
   */
  _this.formatTooltip = function (el, data) {
    var y;

    // add content to tooltip
    data = data.map(function (line) {
      var text = el.append('text');
      if (typeof line.forEach === 'function') {
        // array of components:
        line.forEach(function (l) {
          text.append('tspan').attr('class', l.class || '').text(l.text);
        });
      } else {
        text.attr('class', line.class || '').text(line.text);
      }
      return text;
    });
    // position lines in tooltip
    y = 0;
    data.forEach(function (line) {
      var bbox = line.node().getBBox();
      y += bbox.height;
      line.attr('y', y);
    });
  };

  /**
   * Compute X axis domain.
   *
   * @return {Array}
   *         data domain.
   * @see d3.extent
   */
  _this.getXExtent = function () {
    return _this.model.get('xExtent');
  };

  /**
   * Compute Y axis domain.
   *
   * @return {Array}
   *         data domain.
   * @see d3.extent
   */
  _this.getYExtent = function () {
    return _this.model.get('yExtent');
  };

  /**
   * Zoom event handler.
   */
  _this.onZoom = function () {
    var options,
        t = _this.zoom.translate(),
        tx = t[0],
        ty = t[1],
        width,
        xAxisScale,
        xExtent,
        xSpan;

    // restrict x panning to extent
    options = _this.model.get();
    width = options.width -
        options.marginLeft - options.marginRight -
        options.paddingLeft - options.paddingRight;
    xAxisScale = _xAxis.scale();
    xExtent = _this.getXExtent();
    xSpan = xAxisScale(xExtent[1]) - xAxisScale(xExtent[0]);
    tx = Math.min(tx, 0);
    tx = Math.max(tx, width - xSpan);
    _this.zoom.translate([tx, ty]);
    _this.plotModel.set(
      {
        zoomScale: _this.zoom.scale(),
        zoomTranslate: _this.zoom.translate()
      }
    );
  };

  /**
   * Method for subclasses to plot lines.
   */
  _this.plot = function (/*el*/) {
    // plot lines
  };

  /**
   * Render the graph.
   *
   * @param changed {Object}
   *        default is _this.model.get.
   *        list of properties that have changed.
   * @param zooming {Boolean}
   *        default false.
   *        whether this render is being triggered by a zoom event.
   */
  _this.render = function (changed, zooming) {
    var height,
        innerWidth,
        innerHeight,
        marginBottom,
        marginLeft,
        marginRight,
        marginTop,
        options,
        originalChanged,
        outerHeight,
        outerWidth,
        paddingBottom,
        paddingLeft,
        paddingRight,
        paddingTop,
        width,
        xAxisScale,
        xAxisTicks,
        xExtent,
        yAxisScale,
        yAxisTicks,
        yDomain,
        yDomainPadding,
        yExtent;

    originalChanged = changed;
    // changed options,
    // when called with no arguments, update everything
    changed = changed || _this.model.get();
    // all options
    options = _this.model.get();
    xAxisScale = options.xAxisScale;
    yAxisScale = options.yAxisScale;
    // these are used for label positioning
    paddingBottom = options.paddingBottom;
    paddingLeft = options.paddingLeft;

    if (changed.hasOwnProperty('title')) {
      _plotTitle.textContent = options.title;
    }
    if (changed.hasOwnProperty('xAxisLabel')) {
      _xAxisLabel.textContent = options.xAxisLabel;
    }
    if (changed.hasOwnProperty('yAxisLabel')) {
      _yAxisLabel.textContent = options.yAxisLabel;
    }

    if (changed.hasOwnProperty('width') ||
        changed.hasOwnProperty('height') ||
        changed.hasOwnProperty('marginBottom') ||
        changed.hasOwnProperty('marginLeft') ||
        changed.hasOwnProperty('marginRight') ||
        changed.hasOwnProperty('marginTop') ||
        changed.hasOwnProperty('paddingBottom') ||
        changed.hasOwnProperty('paddingLeft') ||
        changed.hasOwnProperty('paddingRight') ||
        changed.hasOwnProperty('paddingTop')) {
      width = options.width;
      height = options.height;
      marginBottom = options.marginBottom;
      marginLeft = options.marginLeft;
      marginRight = options.marginRight;
      marginTop = options.marginTop;
      paddingRight = options.paddingRight;
      paddingTop = options.paddingTop;
      // adjust based on margin/padding
      outerWidth = width - marginLeft - marginRight;
      outerHeight = height - marginTop - marginBottom;
      innerWidth = outerWidth - paddingLeft - paddingRight;
      innerHeight = outerHeight - paddingTop - paddingBottom;
      // update elements
      _svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      _plotAreaClip.setAttribute('width', innerWidth);
      _plotAreaClip.setAttribute('height', innerHeight);
      _margin.setAttribute('transform',
          'translate(' + marginLeft + ',' + marginTop + ')');
      _outerFrame.setAttribute('height', outerHeight);
      _outerFrame.setAttribute('width', outerWidth);
      _plotTitle.setAttribute('x', outerWidth / 2);
      _plotTitle.setAttribute('y', paddingTop);
      _padding.setAttribute('transform',
          'translate(' + paddingLeft + ',' + paddingTop + ')');
      _innerFrame.setAttribute('width', innerWidth);
      _innerFrame.setAttribute('height', innerHeight);
      _xEl.setAttribute('transform',
          'translate(0,' + innerHeight + ')');
      // update axes range and position
      xAxisScale.range([0, innerWidth]);
      yAxisScale.range([innerHeight, 0]);
      _xAxisLabel.setAttribute('x', innerWidth / 2);
      _yAxisLabel.setAttribute('x', -innerHeight / 2);
    }

    // update axes extent
    if (zooming) {
      // when zooming, xExtent has already been updated
      xExtent = xAxisScale.domain();
    } else {
      // otherwise, show full extent
      xExtent = _this.getXExtent();
    }
    yExtent = _this.getYExtent(xExtent);
    xAxisScale.domain(xExtent);
    yDomainPadding = (yExtent[1] - yExtent[0]) * options.yDomainPadding;
    yDomain = [yExtent[0] - yDomainPadding, yExtent[1] + yDomainPadding];
    yAxisScale.domain(yDomain);
    if (changed.hasOwnProperty('xAxisScale')) {
      _this.zoom.x(xAxisScale);
    }

    // redraw axes
    _xAxis.scale(xAxisScale);
    _xAxis.tickFormat(options.xAxisFormat);
    xAxisTicks = options.xAxisTicks;
    if (typeof xAxisTickValues === 'function') {
      xAxisTicks = xAxisTicks(xExtent);
    }
    _xAxis.ticks(5);
    _xAxis.tickValues(xAxisTicks);

    _yAxis.scale(yAxisScale);
    _yAxis.tickFormat(options.yAxisFormat);
    yAxisTicks = options.yAxisTicks;
    if (typeof yAxisTicks === 'function') {
      yAxisTicks = yAxisTicks(yExtent);
    }
    _yAxis.tickValues(yAxisTicks);

    d3.select(_xAxisEl).call(_xAxis);
    d3.select(_yAxisEl).call(_yAxis);

    // update label positions based on axes size
    _xAxisLabel.setAttribute('y', paddingBottom - _xAxisLabel.getBBox().height);
    _yAxisLabel.setAttribute('y', _yAxisLabel.getBBox().height - paddingLeft);

    // ask subclass to (re)render
    _this.plot(originalChanged);
  };

  /**
   * Updates scale and translate from model and calls render.
   */
  _this.renderZoom = function (changes) {
    if (changes && (changes.zoomScale || changes.zoomTranslate)) {
      _this.zoom.scale(_this.plotModel.get('zoomScale'));
      _this.zoom.translate(_this.plotModel.get('zoomTranslate'));
      // update lines
      _this.render({}, true);
    }
  };

  /**
   * Show a tooltip on the graph.
   *
   * @param coords {Array<x, y>}
   *        coordinate for origin of tooltip.
   * @param data {Array<Object|Array>}
   *        tooltip content, passed to formatTooltip.
   */
  _this.showTooltip = function (coords, data) {
    var bbox,
        content,
        offset,
        options,
        outline,
        padding,
        tooltip,
        tooltipBbox,
        x,
        y;

    tooltip = d3.select(_tooltip);
    // clear tooltip
    tooltip.selectAll('*').remove();
    if (!coords || !data) {
      return;
    }

    options = _this.model.get();
    offset = options.tooltipOffset;
    padding = options.tooltipPadding;
    // create tooltip content
    outline = tooltip.append('rect').attr('class', 'tooltip-outline');
    content = tooltip.append('g').attr('class', 'tooltip-content');
    _this.formatTooltip(content, data);
    // position tooltip outline
    bbox = tooltip.node().getBBox();
    outline.attr('width', bbox.width + 2 * padding)
        .attr('height', bbox.height + 2 * padding);
    content.attr('transform', 'translate(' + padding + ',0)');

    // position tooltip on graph
    // center of point
    x = options.xAxisScale(coords[0]);
    y = options.yAxisScale(coords[1]);
    // box rendering inside
    bbox = _innerFrame.getBBox();
    // box being rendered
    tooltipBbox = _tooltip.getBBox();
    // keep tooltip in graph area
    if (x + tooltipBbox.width > bbox.width) {
      x = x - tooltipBbox.width - offset;
    } else {
      x = x + offset;
    }
    if (y + tooltipBbox.height > bbox.height) {
      y = y - tooltipBbox.height - offset;
    } else {
      y = y + offset;
    }

    if (x < 0) {
      _this.showTooltip(null);
      return;
    }

    // set position
    _tooltip.setAttribute('transform',
        'translate(' + x + ',' + y + ')');
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = D3GraphView;
