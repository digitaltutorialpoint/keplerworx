import React, { Component } from 'react';
import * as d3 from 'd3';
import './App.css';
const requirements = [
  {
    "customerName": "Adventure Works",
    "totalRequirement": 3,
    "skill": "DevOps",
    "jobLevel": "E3"
  },
  {
    "customerName": "Adventure Works",
    "totalRequirement": 3,
    "skill": "UI",
    "jobLevel": "E4"
  },
  {
    "customerName": "Adventure Works",
    "totalRequirement": 2,
    "skill": "UI",
    "jobLevel": "E5"
  },
  {
    "customerName": "Contesso",
    "totalRequirement": 1,
    "skill": "Java",
    "jobLevel": "E3"
  },
  {
    "customerName": "Contesso",
    "totalRequirement": 2,
    "skill": "QA",
    "jobLevel": "E4"
  },
  {
    "customerName": "Omni Consumer Products",
    "totalRequirement": 4,
    "skill": "Ruby",
    "jobLevel": "E3"
  },
  {
    "customerName": "Acme Corporation",
    "totalRequirement": 2,
    "skill": "QA",
    "jobLevel": "E5"
  },
  {
    "customerName": "Globex Corporation",
    "totalRequirement": 1,
    "skill": "Application Support",
    "jobLevel": "E4"
  },
  {
    "customerName": "Hooli",
    "totalRequirement": 1,
    "skill": "JDE",
    "jobLevel": "M1"
  },
  {
    "customerName": "Initech",
    "totalRequirement": 1,
    "skill": "QB-Test",
    "jobLevel": "E3"
  }
];

class SequenceSunburst extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: {}
    };
  }

  componentWillMount() {
    const sunburstData = getStructuredData(this.props.requirements);

    this.setState({
      data: sunburstData
    });
  }

  componentDidMount() {
    const dom = '#suburst';
    createSunburst(dom, this.state.data, this.props.width, this.props.height);
  }

  shouldComponentUpdate() {
    const dom = '#suburst';
    createSunburst(dom, this.state.data, this.props.width, this.props.height);
    return true;
  }

  render() {
    return (
      <div>
        <div className="sequence" />
        <div id="sunburst">
          <div className="summary">
            <span className="summary-count" />
            <br />
            required
          </div>
        </div>
      </div>
    );
  }
}

function getStructuredData(data) {
  const cstData = data;
  const root = { name: 'Total Requirement', children: [] };

  for (const cst in cstData) {
    if (cstData.hasOwnProperty(cst)) {
      const element = cstData[cst];
      const rootCustomer = root.children;
      let customerNode = {};

      // Remove empty strings
      if (element.customerName && element.customerName.length > 0) {
        customerNode = { name: element.customerName, children: [] };

        let skillNode = {
          name: element.skill.length > 0 ? element.skill : 'Other',
          children: []
        };
        let positionNode = {
          name: element.jobLevel,
          size: element.totalRequirement
        };

        let hasCustomer = rootCustomer.find(
          e => e.name === element.customerName
        );

        // If customers exists append skill
        if (!!hasCustomer) {
          let hasSkill = hasCustomer.children.find(
            e => e.name === element.skill
          );

          // If skill exists append position
          if (!!hasSkill) {
            let hasPosition = hasSkill.children.find(e => {
              return e.name === element.jobLevel;
            });

            if (!!hasPosition) {
              positionNode.size += hasPosition.size;
              hasPosition.size = 0;
            }

            hasSkill.children.push(positionNode);
          } else {
            skillNode.children.push(positionNode);
          }

          hasCustomer.children.push(skillNode);
        } else {
          skillNode.children.push(positionNode);
          customerNode.children.push(skillNode);

          root.children.push(customerNode);
        }
      }
    }
  }

  return root;
}

function createSunburst(dom, data, width, height) {
  const chartWidth = width || 800;
  const chartHeight = height || 550;
  const radius = Math.min(width, height) / 2;

  const NOOP = () => {};

  const breadcrumb = {
    w: 120,
    h: 30,
    s: 3,
    t: 10
  };
  let totalSize = 0;
  var colors = d3.scaleOrdinal().range(["red", "green", "blue", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
    

  const partition = d3.partition().size([2 * Math.PI, radius * radius]);

  const arc = d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.sqrt(d.y0))
    .outerRadius(d => Math.sqrt(d.y1));

  const svg = d3
    .select('#sunburst')
    .append('svg')
    .attr('width', chartWidth)
    .attr('height', chartHeight)
    .append('g')
    .attr('id', 'container')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  initialRender(data);
  function initialRender(json) {
    let root = d3
      .hierarchy(json)
      .sum(d => d.size)
      .sort((a, b) => b.value - a.value);

    // Initiate the breadcrumb
    initialBreadcrumbTrail();

    svg
      .append('svg:circle')
      .attr('r', radius)
      .style('opacity', 0);

    const nodes = partition(root)
      .descendants()
      .filter(d => {
        return d.x1 - d.x0 > 0.005;
      });

    const path = svg
      .data([json])
      .selectAll('path')
      .data(nodes)
      .enter()
      .append('path')
      .attr('display', d => {
        // return d.depth ? null : "none";
        return d.depth ? null : NOOP;
      })
      .attr('d', arc)
      .attr('fill-rule', 'evenodd')
      .style('fill', d => colors(d.data.name))
      .style('opacity', 1)
      .on('mouseover', mouseover);

    // console.log(json);
    totalSize = path.node().__data__.value;
    d3.select('.summary-count').text(totalSize);
    d3.select('#container').on('mouseleave', mouseleave);
  }

  function mouseover(d) {
    const requirement = d.value;

    d3.select('.summary-count').text(requirement);

    const sequenceArr = d.ancestors().reverse();
    sequenceArr.shift(); //remove root node from array

    updateBreadcrumbs(sequenceArr, requirement);

    d3.selectAll('path').style('opacity', 0.3);

    svg
      .selectAll('path')
      .filter(node => {
        return sequenceArr.indexOf(node) >= 0;
      })
      .style('opacity', 1);
  }

  function mouseleave(d) {
    d3.select('#trail').style('visibility', 'hidden');

    d3.selectAll('path').on('mouseover', null);

    d3
      .selectAll('path')
      .transition()
      .duration(1000)
      .style('opacity', 1)
      .on('end', function() {
        d3.select(this).on('mouseover', mouseover);
      });
    d3.select('.summary-count').text(totalSize);
  }

  function initialBreadcrumbTrail() {
    const trail = d3
      .select('.sequence')
      .append('svg')
      .attr('width', width)
      .attr('height', 50)
      .attr('id', 'trail');

    trail
      .append('text')
      .attr('id', 'endlabel')
      .style('fill', '#fff');
  }

  function updateBreadcrumbs(nodesArr, requirement) {
    const trail = d3
      .select('#trail')
      .selectAll('g')
      .data(nodesArr, d => d.data.name + d.depth);

    trail.exit().remove();

    const entering = trail.enter().append('g');

    entering
      .append('svg:polygon')
      .attr('points', breadcrumbPoints)
      .style('fill', d => colors(d.data.name));

    entering
      .append('text')
      .attr('x', (breadcrumb.w + breadcrumb.t) / 2)
      .attr('y', breadcrumb.h / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => truncateString(d.data.name, 12));

    // Merge enter and update selections; set position for all nodes.
    entering.merge(trail).attr('transform', (d, i) => {
      return `translate(${i * (breadcrumb.w + breadcrumb.s)}, ${0})`;
    });

    // Now move and update the percentage at the end.
    d3
      .select('#trail')
      .select('#endlabel')
      .attr('x', (nodesArr.length + 0.5) * (breadcrumb.w + breadcrumb.s))
      .attr('y', breadcrumb.h / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(requirement);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select('#trail').style('visibility', '');
  }

  const breadcrumbPoints = (d, i) => {
    let points = [];

    points.push('0,0');
    points.push(breadcrumb.w, '0');
    points.push(breadcrumb.w + breadcrumb.t + ',' + breadcrumb.h / 2);
    points.push(breadcrumb.w + ',' + breadcrumb.h);
    points.push('0,' + breadcrumb.h);
    if (i > 0) {
      points.push(breadcrumb.t + ',' + breadcrumb.h / 2);
    }
    return points.join(' ');
  };
}

const truncateString = (str, length) => {
  if (!str) return;
  return str.length < length ? str : `${str.slice(0, length)}...`;
};


export default class App extends React.Component {
  render() {
    return (<div className="App">
      <header className="App-header">
      <SequenceSunburst requirements={requirements} width={500} height={200} />
      </header>
      </div>
    );
  }
}
