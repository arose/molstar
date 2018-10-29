/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { ComplexRepresentation, StructureRepresentation, UnitsRepresentation } from '..';
import { ElementSphereVisual, ElementSphereParams } from '../visual/element-sphere';
import { IntraUnitLinkVisual, IntraUnitLinkParams } from '../visual/intra-unit-link-cylinder';
import { PickingId } from '../../../geometry/picking';
import { Structure } from 'mol-model/structure';
import { Task } from 'mol-task';
import { Loci, isEmptyLoci } from 'mol-model/loci';
import { MarkerAction } from '../../../geometry/marker-data';
import { InterUnitLinkVisual } from '../visual/inter-unit-link-cylinder';
import { SizeThemeName, SizeThemeOptions } from 'mol-canvas3d/theme/size';
import { getQualityProps } from '../../util';
import { paramDefaultValues, SelectParam, NumberParam, MultiSelectParam } from 'mol-util/parameter';
import { UnitKind, UnitKindOptions } from '../visual/util/common';

export const BallAndStickParams = {
    ...ElementSphereParams,
    ...IntraUnitLinkParams,
    sizeTheme: SelectParam<SizeThemeName>('Size Theme', '', 'uniform', SizeThemeOptions),
    sizeValue: NumberParam('Size Value', '', 0.2, 0, 10, 0.1),
    sizeFactor: NumberParam('Size Factor', '', 1, 0, 10, 0.1),
    unitKinds: MultiSelectParam<UnitKind>('Unit Kind', '', ['atomic'], UnitKindOptions),
}
export const DefaultBallAndStickProps = paramDefaultValues(BallAndStickParams)
export type BallAndStickProps = typeof DefaultBallAndStickProps

export type BallAndStickRepresentation = StructureRepresentation<BallAndStickProps>

export function BallAndStickRepresentation(): BallAndStickRepresentation {
    const elmementRepr = UnitsRepresentation('Element sphere mesh', ElementSphereVisual)
    const intraLinkRepr = UnitsRepresentation('Intra-unit link cylinder', IntraUnitLinkVisual)
    const interLinkRepr = ComplexRepresentation('Inter-unit link cylinder', InterUnitLinkVisual)

    let currentProps: BallAndStickProps
    return {
        label: 'Ball & Stick',
        params: BallAndStickParams,
        get renderObjects() {
            return [ ...elmementRepr.renderObjects, ...intraLinkRepr.renderObjects, ...interLinkRepr.renderObjects ]
        },
        get props() {
            return { ...elmementRepr.props, ...intraLinkRepr.props, ...interLinkRepr.props }
        },
        createOrUpdate: (props: Partial<BallAndStickProps> = {}, structure?: Structure) => {
            const qualityProps = getQualityProps(Object.assign({}, currentProps, props), structure)
            currentProps = Object.assign({}, DefaultBallAndStickProps, currentProps, props, qualityProps)
            return Task.create('BallAndStickRepresentation', async ctx => {
                await elmementRepr.createOrUpdate(currentProps, structure).runInContext(ctx)
                await intraLinkRepr.createOrUpdate(currentProps, structure).runInContext(ctx)
                await interLinkRepr.createOrUpdate(currentProps, structure).runInContext(ctx)
            })
        },
        getLoci: (pickingId: PickingId) => {
            const sphereLoci = elmementRepr.getLoci(pickingId)
            const intraLinkLoci = intraLinkRepr.getLoci(pickingId)
            const interLinkLoci = interLinkRepr.getLoci(pickingId)
            if (isEmptyLoci(sphereLoci)) {
                if (isEmptyLoci(intraLinkLoci)) {
                    return interLinkLoci
                } else {
                    return intraLinkLoci
                }
            } else {
                return sphereLoci
            }
        },
        mark: (loci: Loci, action: MarkerAction) => {
            const markElement = elmementRepr.mark(loci, action)
            const markIntraLink = intraLinkRepr.mark(loci, action)
            const markInterLink = interLinkRepr.mark(loci, action)
            return markElement || markIntraLink || markInterLink
        },
        destroy() {
            elmementRepr.destroy()
            intraLinkRepr.destroy()
            interLinkRepr.destroy()
        }
    }
}