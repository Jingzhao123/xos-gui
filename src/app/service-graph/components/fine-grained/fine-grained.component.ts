import {IXosServiceGraphStore} from '../../services/graph.store';
import './fine-grained.component.scss';
import * as d3 from 'd3';
import * as $ from 'jquery';
import {Subscription} from 'rxjs';
import {XosServiceGraphConfig as config} from '../../graph.config';
import {IXosDebouncer} from '../../../core/services/helpers/debounce.helper';
import {IXosServiceGraph, IXosServiceGraphLink, IXosServiceGraphNode} from '../../interfaces';
import {IXosModelDiscovererService} from '../../../datasources/helpers/model-discoverer.service';
import {IXosSidePanelService} from '../../../core/side-panel/side-panel.service';
import {IXosGraphHelpers} from '../../services/d3-helpers/graph.helpers';

class XosFineGrainedTenancyGraphCtrl {
  static $inject = [
    '$log',
    'XosServiceGraphStore',
    'XosDebouncer',
    'XosModelDiscoverer',
    'XosSidePanel',
    'XosGraphHelpers'
  ];

  public graph: IXosServiceGraph;

  private GraphSubscription: Subscription;
  private svg;
  private forceLayout;
  private linkGroup;
  private nodeGroup;
  private defs;

  // debounced functions
  private renderGraph;

  constructor(
    private $log: ng.ILogService,
    private XosServiceGraphStore: IXosServiceGraphStore,
    private XosDebouncer: IXosDebouncer,
    private XosModelDiscoverer: IXosModelDiscovererService,
    private XosSidePanel: IXosSidePanelService,
    private XosGraphHelpers: IXosGraphHelpers
  ) {
    this.handleSvg();
    this.loadDefs();
    this.setupForceLayout();
    this.renderGraph = this.XosDebouncer.debounce(this._renderGraph, 500, this);

    $(window).on('resize', () => {
      this.setupForceLayout();
      this.renderGraph();
    });

    this.GraphSubscription = this.XosServiceGraphStore.get()
      .subscribe(
        (graph) => {
          this.$log.debug(`[XosFineGrainedTenancyGraphCtrl] Fine-Grained Event and render`, graph);

          if (!graph || !graph.nodes || !graph.links) {
            return;
          }

          this.graph = graph;
          this.renderGraph();
        },
        (err) => {
          this.$log.error(`[XosFineGrainedTenancyGraphCtrl] Error: `, err);
        }
      );
  }

  $onDestroy() {
    this.GraphSubscription.unsubscribe();
  }

  private _renderGraph() {
    this.addNodeLinksToForceLayout(this.graph);
    this.renderNodes(this.graph.nodes);
    this.renderLinks(this.graph.links);
  }

  private getSvgDimensions(): {width: number, heigth: number} {
    return {
      width: $('xos-fine-grained-tenancy-graph svg').width(),
      heigth: $('xos-fine-grained-tenancy-graph svg').height()
    };
  }

  private handleSvg() {
    this.svg = d3.select('svg');

    this.defs = this.svg.append('defs');

    this.linkGroup = this.svg.append('g')
      .attr({
        class: 'link-group'
      });

    this.nodeGroup = this.svg.append('g')
      .attr({
        class: 'node-group'
      });
  }

  private loadDefs() {
      const cloud = {
          vbox: '0 0 303.8 185.8',
          path: `M88.6,44.3c31.7-45.5,102.1-66.7,135-3
             M37.8,142.9c-22.5,3.5-60.3-32.4-16.3-64.2
             M101.8,154.2c-15.6,59.7-121.4,18.8-77.3-13
             M194.6,150c-35.4,51.8-85.7,34.3-98.8-9.5
             M274.4,116.4c29.4,73.2-81.9,80.3-87.7,44.3
             M28.5,89.2C3.7,77.4,55.5,4.8,95.3,36.1
             M216.1,28.9C270.9-13,340.8,91,278.4,131.1`,
          bgpath: `M22,78.3C21.5,55.1,62.3,10.2,95.2,36
             h0c31.9-33.4,88.1-50.5,120.6-7.2l0.3,0.2
             C270.9-13,340.8,91,278.4,131.1v-0.5
             c10.5,59.8-86.4,63.7-91.8,30.1h-0.4
             c-30.2,33.6-67.6,24-84.6-6v-0.4
             c-15.6,59.7-121.4,18.8-77.3-13
             l-0.2-.2c-20.2-7.9-38.6-36.5-2.8-62.3Z`
      };

      this.defs.append('symbol')
          .attr({ id: 'cloud', viewBox: cloud.vbox })
          .append('path').attr('d', cloud.path);

      this.defs.append('symbol')
          .attr({ id: 'cloud_bg', viewBox: cloud.vbox })
          .append('path').attr('d', cloud.bgpath);
  }

  private setupForceLayout() {

    const tick = () => {
      this.nodeGroup.selectAll('g.node')
        .attr({
          transform: d => `translate(${d.x}, ${d.y})`
        });

      this.linkGroup.selectAll('line')
        .attr({
          x1: l => l.source.x || 0,
          y1: l => l.source.y || 0,
          x2: l => l.target.x || 0,
          y2: l => l.target.y || 0,
        });
    };
    const svgDim = this.getSvgDimensions();
    this.forceLayout = d3.layout.force()
      .size([svgDim.width, svgDim.heigth])
      .linkDistance(config.force.linkDistance)
      .charge(config.force.charge)
      .gravity(config.force.gravity)
      .on('tick', tick);
  }

  private addNodeLinksToForceLayout(data: IXosServiceGraph) {
    this.forceLayout
      .nodes(data.nodes)
      .links(data.links)
      .start();
  }

  private renderServiceNodes(nodes: any) {

    const self = this;
    nodes.append('rect')
    .attr({
      rx: config.node.radius,
      ry: config.node.radius
    });

    nodes.append('text')
      .attr({
        'text-anchor': 'middle'
      })
      .text(n => n.label);
    // .text(n => `${n.id} - ${n.label}`);

    const existing = nodes.selectAll('rect');

    // resize node > rect as contained text
    existing.each(function() {
      const textBBox = self.XosGraphHelpers.getSiblingTextBBox(this);
      const rect = d3.select(this);
      rect.attr({
        width: textBBox.width + config.node.padding,
        height: textBBox.height + config.node.padding,
        x: textBBox.x - (config.node.padding / 2),
        y: textBBox.y - (config.node.padding / 2)
      });
    });
  }

  private renderTenantNodes(nodes: any) {
    nodes.append('rect')
      .attr({
        width: 40,
        height: 40,
        x: -25,
        y: -25,
        transform: `rotate(45)`
      });

    nodes.append('text')
      .attr({
        'text-anchor': 'middle'
      })
      .text(n => n.label);
  }

  private renderNetworkNodes(nodes: any) {
    const self = this;
    const yTextOff = 8;

    nodes.append('use')
        .attr({
            class: 'symbol-bg',
            'xlink:href': '#cloud_bg'
        });

    nodes.append('use')
        .attr({
            class: 'symbol',
            'xlink:href': '#cloud'
        });

    nodes.append('text')
      .attr({
          'text-anchor': 'middle',
          'transform': 'translate(0,' + yTextOff + ')'
      })
      .text(n => n.label);

    const existing = nodes.selectAll('use');

    // resize node > rect as contained text
    existing.each(function() {
      const textBBox = self.XosGraphHelpers.getSiblingTextBBox(this);
      const useElem = d3.select(this);
      const w = textBBox.width + config.node.padding * 2;
      const h = w;
      const xoff = -(w / 2);
      const yoff = -(h / 2);

      useElem.attr({
          width: w,
          height: h,
          transform: 'translate(' + xoff + ',' + yoff + ')'
      });
    });
  }

  private renderSubscriberNodes(nodes: any) {
    const self = this;
    nodes.append('rect');

    nodes.append('text')
      .attr({
        'text-anchor': 'middle'
      })
      .text(n => n.label);

    const existing = nodes.selectAll('rect');

    // resize node > rect as contained text
    existing.each(function() {
      const textBBox = self.XosGraphHelpers.getSiblingTextBBox(this);
      const rect = d3.select(this);
      rect.attr({
        width: textBBox.width + config.node.padding,
        height: textBBox.height + config.node.padding,
        x: textBBox.x - (config.node.padding / 2),
        y: textBBox.y - (config.node.padding / 2)
      });
    });
  }

  private renderNodes(nodes: IXosServiceGraphNode[]) {
    const node = this.nodeGroup
      .selectAll('g.node')
      .data(nodes, n => n.id);

    let mouseEventsTimer, selectedModel;
    const svgDim = this.getSvgDimensions();
    const hStep = svgDim.width / (nodes.length - 1);
    const vStep = svgDim.heigth / (nodes.length - 1);
    const entering = node.enter()
      .append('g')
      .attr({
        class: n => `node ${n.type} ${this.XosGraphHelpers.parseElemClasses(n.d3Class)}`,
        transform: (n, i) => `translate(${hStep * i}, ${vStep * i})`
      })
      .call(this.forceLayout.drag)
      .on('mousedown', () => {
        mouseEventsTimer = new Date().getTime();
        d3.event.stopPropagation();
      })
      .on('mouseup', (n) => {
        mouseEventsTimer = new Date().getTime() - mouseEventsTimer;
        n.fixed = true;
      })
      .on('click', (n: IXosServiceGraphNode) => {
        if (mouseEventsTimer > 100) {
          // it is a drag
          return;
        }
        if (selectedModel === n.id) {
          // this model is already selected, so close the panel
          this.XosSidePanel.removeInjectedComponents();
          selectedModel = null;
          return;
        }
        selectedModel = n.id;
        const modelName = n.model['class_names'].split(',')[0];
        const formConfig = this.XosModelDiscoverer.get(modelName).formCfg;
        const model = angular.copy(n.model);
        delete model.d3Id;
        this.XosSidePanel.injectComponent('xosForm', {config: formConfig, ngModel: model});
      });

    this.renderServiceNodes(entering.filter('.service'));
    this.renderTenantNodes(entering.filter('.tenant'));
    this.renderNetworkNodes(entering.filter('.network'));
    this.renderSubscriberNodes(entering.filter('.subscriber'));
  }

  private renderLinks(links: IXosServiceGraphLink[]) {
    const link = this.linkGroup
      .selectAll('line')
      .data(links, l => l.id);

    const entering = link.enter();

    entering.append('line')
      .attr({
        class: n => `link ${this.XosGraphHelpers.parseElemClasses(n.d3Class)}`,
        'marker-start': 'url(#arrow)'
      });
  }
}

export const XosFineGrainedTenancyGraph: angular.IComponentOptions = {
  template: require('./fine-grained.component.html'),
  controllerAs: 'vm',
  controller: XosFineGrainedTenancyGraphCtrl,
};
