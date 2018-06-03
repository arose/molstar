/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Unit, Element } from 'mol-model/structure';
import { Mat4, Vec2, Vec3 } from 'mol-math/linear-algebra'

import { createUniformColor, ColorData } from '../../util/color-data';
import { createUniformSize } from '../../util/size-data';
import { elementSizeData } from '../../theme/structure/size/element';
import VertexMap from '../../shape/vertex-map';
import { ColorTheme, SizeTheme } from '../../theme';
import { elementIndexColorData, elementSymbolColorData, instanceIndexColorData, chainIdColorData } from '../../theme/structure/color';
import { ValueCell } from 'mol-util';
import { TextureImage, createTextureImage } from 'mol-gl/renderable/util';
import { Mesh } from '../../shape/mesh';
import { Task } from 'mol-task';
import { icosahedronVertexCount } from '../../primitive/icosahedron';
import { MeshBuilder } from '../../shape/mesh-builder';

export function createTransforms({ units }: Unit.SymmetryGroup, transforms?: ValueCell<Float32Array>) {
    const unitCount = units.length
    const n = unitCount * 16
    const array = transforms && transforms.ref.value.length >= n ? transforms.ref.value : new Float32Array(n)
    for (let i = 0; i < unitCount; i++) {
        Mat4.toArray(units[i].conformation.operator.matrix, array, i * 16)
    }
    return transforms ? ValueCell.update(transforms, array) : ValueCell.create(array)
}

export function createColors(group: Unit.SymmetryGroup, vertexMap: VertexMap, props: ColorTheme, colorData?: ColorData) {
    switch (props.name) {
        case 'atom-index':
            return elementIndexColorData({ group, vertexMap }, colorData)
        case 'chain-id':
            return chainIdColorData({ group, vertexMap }, colorData)
        case 'element-symbol':
            return elementSymbolColorData({ group, vertexMap }, colorData)
        case 'instance-index':
            return instanceIndexColorData({ group, vertexMap }, colorData)
        case 'uniform':
            return createUniformColor(props, colorData)
    }
}

export function createSizes(group: Unit.SymmetryGroup, vertexMap: VertexMap, props: SizeTheme) {
    switch (props.name) {
        case 'uniform':
            return createUniformSize(props)
        case 'vdw':
            return elementSizeData({ group, vertexMap })
    }
}

export type FlagData = {
    tFlag: ValueCell<TextureImage>
    uFlagTexSize: ValueCell<Vec2>
}

export function createFlags(group: Unit.SymmetryGroup, instanceId: number, elementId: number, flagData?: FlagData): FlagData {
    const instanceCount = group.units.length
    const elementCount = group.elements.length
    const count = instanceCount * elementCount
    const flags = flagData && flagData.tFlag.ref.value.array.length >= count ? flagData.tFlag.ref.value : createTextureImage(count, 1)
    let flagOffset = 0
    for (let i = 0; i < instanceCount; i++) {
        for (let j = 0, jl = elementCount; j < jl; ++j) {
            flags.array[flagOffset] = (i === instanceId && j === elementId) ? 255 : 0
            flagOffset += 1
        }
    }
    // console.log(flags, instanceCount, elementCount)
    if (flagData) {
        ValueCell.update(flagData.tFlag, flags)
        ValueCell.update(flagData.uFlagTexSize, Vec2.create(flags.width, flags.height))
        return flagData
    } else {
        return {
            tFlag: ValueCell.create(flags),
            uFlagTexSize: ValueCell.create(Vec2.create(flags.width, flags.height)),
        }
    }
}

const emptyFlagTexture = { array: new Uint8Array(1), width: 1, height: 1 }
export function createEmptyFlags(flagData?: FlagData) {
    if (flagData) {
        ValueCell.update(flagData.tFlag, emptyFlagTexture)
        ValueCell.update(flagData.uFlagTexSize, Vec2.create(1, 1))
        return flagData
    } else {
        return {
            tFlag: ValueCell.create(emptyFlagTexture),
            uFlagTexSize: ValueCell.create(Vec2.create(1, 1)),
        }
    }
}

export function createSphereMesh(unit: Unit, radius: Element.Property<number>, detail: number, mesh?: Mesh) {
    return Task.create('Sphere mesh', async ctx => {
        const { elements } = unit;
        const elementCount = elements.length;
        const vertexCount = elementCount * icosahedronVertexCount(detail)
        const meshBuilder = MeshBuilder.create(vertexCount, vertexCount / 2, mesh)

        const v = Vec3.zero()
        const m = Mat4.identity()

        const { x, y, z } = unit.conformation
        const l = Element.Location()
        l.unit = unit

        for (let i = 0; i < elementCount; i++) {
            l.element = elements[i]
            v[0] = x(l.element)
            v[1] = y(l.element)
            v[2] = z(l.element)
            Mat4.setTranslation(m, v)

            meshBuilder.setId(i)
            meshBuilder.addIcosahedron(m, { radius: radius(l), detail })

            if (i % 10000 === 0 && ctx.shouldUpdate) {
                await ctx.update({ message: 'Sphere mesh', current: i, max: elementCount });
            }
        }

        return meshBuilder.getMesh()
    })
}
