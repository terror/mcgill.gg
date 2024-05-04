import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import VisGraph, { Edge, GraphData, Node } from 'react-vis-graph-wrapper';
import { v4 as uuidv4 } from 'uuid';

import { useDarkMode } from '../hooks/useDarkMode';
import { Course, ReqNode } from '../lib/model';
import {
  courseIdToUrlParam,
  isValidCourseCode,
  spliceCourseCode,
} from '../lib/utils';

type CourseGraphProps = {
  course: Course;
};

const groupColors = {
  prerequisite: 'rgb(252 165 165)',
  corequisite: 'rgb(134 239 172)',
  operator: '#ffffff',
};

type NodeType = 'operator' | 'prerequisite' | 'corequisite';

const makeGraph = (nodeGroup: NodeType, reqs?: ReqNode) => {
  if (!reqs) return { nodes: [], edges: [], root: undefined };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const traverse = (node: ReqNode): string => {
    if (node.type === 'Course') {
      const duplicates = nodes.filter((n) =>
        (n.id as string).startsWith(node.content)
      ).length;

      const id = duplicates === 0 ? node.content : `${node}_${duplicates}`;

      nodes.push({
        id,
        label: node.content,
        color: groupColors[nodeGroup],
      });

      return id;
    }

    const codes = node.content.groups.map((group) => traverse(group)),
      id = codes.join(node.content.operator);

    nodes.push({
      id,
      label: node.content.operator,
      size: 6,
      color: groupColors['operator'],
      shape: 'hexagon',
    });

    for (const code of codes)
      edges.push({
        from: code,
        to: id,
        dashes: node.content.operator === 'OR',
      });

    return id;
  };

  const root = traverse(reqs);

  return { nodes, edges, root };
};

export const CourseGraph = memo(({ course }: CourseGraphProps) => {
  const navigate = useNavigate();

  const [darkMode] = useDarkMode();

  const {
    nodes: prereqNodes,
    edges: prereqEdges,
    root: prereqRoot,
  } = makeGraph('prerequisite', course.logicalPrerequisites);

  const {
    nodes: coreqNodes,
    edges: coreqEdges,
    root: coreqRoot,
  } = makeGraph('corequisite', course.logicalCorequisites);

  const leading = course.leadingTo.map((leading) => {
    return {
      id: spliceCourseCode(leading, ' '),
      label: spliceCourseCode(leading, ' '),
    };
  });

  const graphNodes: Node[] = [
    {
      id: course._id,
      label: spliceCourseCode(course._id, ' '),
      title: course.description,
    },
    ...prereqNodes,
    ...coreqNodes,
    ...leading,
  ];

  const graph: GraphData = {
    nodes: graphNodes,
    edges: [
      ...prereqEdges,
      ...coreqEdges,
      { from: prereqRoot, to: course._id },
      { from: coreqRoot, to: course._id },
      ...leading.map((leading) => {
        return { from: course._id, to: leading.id };
      }),
    ],
  };

  const navigateToCourse = (nodes: string[]) => {
    if (nodes.length === 0) return;

    const node = graphNodes.find((node) => node.id === nodes[0]);

    if (!node || !node.id) return;

    const [courseCode, rest] = (node.id as string).split('_', 2);
    const isOperator = rest !== undefined && isNaN(+rest);

    if (!isValidCourseCode(courseCode) || isOperator) return;

    navigate(
      `/course/${courseIdToUrlParam(courseCode.toString().replace(' ', ''))}`
    );
  };

  return (
    <VisGraph
      key={uuidv4()}
      graph={graph}
      options={{
        edges: { color: darkMode ? '#919191' : '#b1b1b1' },
        height: '288px',
        layout: {
          randomSeed: undefined,
          improvedLayout: true,
          clusterThreshold: 150,
          hierarchical: {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 100,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true,
            direction: 'LR',
            sortMethod: 'directed',
            shakeTowards: 'leaves',
          },
        },
        nodes: {
          color: darkMode ? 'rgb(212 212 212)' : 'rgb(226 232 240)',
          shape: 'dot',
          size: 14,
          font: {
            color: darkMode ? '#FFFFFF' : '#000000',
          },
        },
      }}
      getNetwork={(network) => {
        network.focus(course._id, {
          scale: 0.7,
          offset: {
            x: 60,
            y: 0,
          },
        });
      }}
      events={{
        select: ({ nodes }: { nodes: string[] }) => {
          navigateToCourse(nodes);
        },
        doubleClick: ({ nodes }: { nodes: string[] }) => {
          navigateToCourse(nodes);
        },
      }}
    />
  );
});
