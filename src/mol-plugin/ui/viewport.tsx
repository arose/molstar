/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import * as React from 'react';
import { PluginContext } from '../context';
import { Loci, EmptyLoci, areLociEqual } from 'mol-model/loci';
import { MarkerAction } from 'mol-geo/geometry/marker-data';

interface ViewportProps {
    plugin: PluginContext
}

interface ViewportState {
    noWebGl: boolean
}

export class Viewport extends React.Component<ViewportProps, ViewportState> {
    private container: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;

    state: ViewportState = {
        noWebGl: false
    };

    handleResize() {
        this.props.plugin.viewer.handleResize();
    }

    componentDidMount() {
        if (!this.canvas || !this.container || !this.props.plugin.initViewer(this.canvas, this.container)) {
            this.setState({ noWebGl: true });
        }
        this.handleResize();

        const viewer = this.props.plugin.viewer;
        viewer.input.resize.subscribe(() => this.handleResize());

        let prevLoci: Loci = EmptyLoci;
        viewer.input.move.subscribe(({x, y, inside, buttons}) => {
            if (!inside || buttons) return;
            const p = viewer.identify(x, y);
            if (p) {
                const loci = viewer.getLoci(p);

                if (!areLociEqual(loci, prevLoci)) {
                    viewer.mark(prevLoci, MarkerAction.RemoveHighlight);
                    viewer.mark(loci, MarkerAction.Highlight);
                    prevLoci = loci;
                }
            }
        })
    }

    componentWillUnmount() {
        if (super.componentWillUnmount) super.componentWillUnmount();
        // TODO viewer cleanup
    }

    renderMissing() {
        return <div>
            <div>
                <p><b>WebGL does not seem to be available.</b></p>
                <p>This can be caused by an outdated browser, graphics card driver issue, or bad weather. Sometimes, just restarting the browser helps.</p>
                <p>For a list of supported browsers, refer to <a href='http://caniuse.com/#feat=webgl' target='_blank'>http://caniuse.com/#feat=webgl</a>.</p>
            </div>
        </div>
    }

    render() {
        if (this.state.noWebGl) return this.renderMissing();

        return <div style={{ backgroundColor: 'rgb(0, 0, 0)', width: '100%', height: '100%'}}>
            <div ref={elm => this.container = elm} style={{width: '100%', height: '100%'}}>
                <canvas ref={elm => this.canvas = elm}></canvas>
            </div>
        </div>;
    }
}