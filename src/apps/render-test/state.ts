/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { ValueCell } from 'mol-util/value-cell'

import { Vec3, Mat4 } from 'mol-math/linear-algebra'
import { createRenderer, createRenderObject, RenderObject } from 'mol-gl/renderer'
import { createColorTexture } from 'mol-gl/util';
import Icosahedron from 'mol-geo/primitive/icosahedron'
import Box from 'mol-geo/primitive/box'
import Spacefill from 'mol-geo/representation/structure/spacefill'
import Point from 'mol-geo/representation/structure/point'

import CIF from 'mol-io/reader/cif'
import { Run, Progress } from 'mol-task'
import { Structure } from 'mol-model/structure'

function log(progress: Progress) {
    const p = progress.root.progress
    console.log(`${p.message} ${(p.current/p.max*100).toFixed(2)}%`)
}

async function parseCif(data: string|Uint8Array) {
    const comp = CIF.parse(data)
    const parsed = await Run(comp, log, 100);
    if (parsed.isError) throw parsed;
    return parsed
}

async function getPdb(pdb: string) {
    const data = await fetch(`https://files.rcsb.org/download/${pdb}.cif`)
    const parsed = await parseCif(await data.text())
    const structure = Structure.ofData({ kind: 'mmCIF', data: CIF.schema.mmCIF(parsed.result.blocks[0]) })
    return structure
}

import mcubes from './mcubes'
// import Cylinder from 'mol-geo/primitive/cylinder';

export default class State {
    async initRenderer (container: HTMLDivElement) {
        const renderer = createRenderer(container)

        const p1 = Vec3.create(0, 4, 0)
        const p2 = Vec3.create(-3, 0, 0)

        // const position = ValueCell.create(new Float32Array([0, -1, 0, -1, 0, 0, 1, 1, 0]))
        // const normal = ValueCell.create(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]))

        const transformArray1 = ValueCell.create(new Float32Array(16))
        const transformArray2 = ValueCell.create(new Float32Array(16 * 3))
        const m4 = Mat4.identity()
        Mat4.toArray(m4, transformArray1.ref.value, 0)
        Mat4.toArray(m4, transformArray2.ref.value, 0)
        Mat4.setTranslation(m4, p1)
        Mat4.toArray(m4, transformArray2.ref.value, 16)
        Mat4.setTranslation(m4, p2)
        Mat4.toArray(m4, transformArray2.ref.value, 32)

        const color = ValueCell.create(createColorTexture(3))
        color.ref.value.set([
            0, 0, 255,
            0, 255, 0,
            255, 0, 0
        ])

        // const points = createRenderObject('point', {
        //     position,
        //     transform: transformArray1
        // })
        // // renderer.add(points)

        // const mesh = createRenderObject('mesh', {
        //     position,
        //     normal,
        //     color,
        //     transform: transformArray2
        // })
        // renderer.add(mesh)

        // const cylinder = Cylinder({ height: 3, radiusBottom: 0.5, radiusTop: 0.5 })
        // console.log(cylinder)
        // const cylinderMesh = createRenderObject('mesh', {
        //     position: ValueCell.create(cylinder.vertices),
        //     normal: ValueCell.create(cylinder.normals),
        //     color,
        //     transform: transformArray2
        // }, cylinder.indices)
        // renderer.add(cylinderMesh)

        // const sphere = Icosahedron()
        // console.log(sphere)

        // const box = Box()
        // console.log(box)

        // const points2 = createRenderObject('point', {
        //     position: ValueCell.create(new Float32Array(box.vertices)),
        //     transform: transformArray1
        // })
        // renderer.add(points2)

        let rr = 0.7;
        function cubesF(x: number, y: number, z: number) {
            return x * x + y * y + z * z - rr * rr;
        }
        let cubes = await mcubes(cubesF);

        const makeCubesMesh = () => createRenderObject('mesh', {
            position: cubes.surface.vertexBuffer,
            normal: cubes.surface.normalBuffer,
            color,
            transform: transformArray2,
            elements: cubes.surface.indexBuffer,

            instanceCount: transformArray2.ref.value.length / 16,
            elementCount: cubes.surface.triangleCount,
            positionCount: cubes.surface.vertexCount
        }, {});
        const mesh2 = makeCubesMesh();
        renderer.add(mesh2)

        const structures = await getPdb('4v99')
        const { elements, units } = structures[0];

        // const spacefill = Spacefill()
        // const spacefills = await Run(spacefill.create(units, elements), log, 100)
        // spacefills.forEach(renderer.add)

        const point = Point()
        const points = await Run(point.create(units, elements), log, 100)
        points.forEach(renderer.add)

        renderer.frame()
    }
}
