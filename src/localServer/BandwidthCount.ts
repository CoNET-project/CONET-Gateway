import {Transform, TransformCallback} from 'node:stream'
import { logger } from './logger'

// 统计防抖常量：最小测量时长 & 上报限幅
const MIN_SAMPLE_MS = 50;        // 小于该时长的样本按 50ms 计
const MAX_REPORT_MBPS = 1000;    // 上报限幅，防极端爆表

export class BandwidthCount extends Transform {
    private count = 0
    private startTime = 0
    private endTime = 0
    private printed = false

    constructor(private tab: string){
        super({
            readableHighWaterMark: 64 * 1024,
            writableHighWaterMark: 64 * 1024
        })
    }

    public _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        if (!this.startTime) {
            this.startTime = Date.now()
        }
        this.count += chunk.length
        // logger(`${this.tab} start at ${this.startTime} BandwidthCount ${this.count} bytes`)
        this.push(chunk)
        callback()
    }

    public _final(callback: (error?: Error | null | undefined) => void): void {
        this.endTime = Date.now()
        this.finishIfNeeded('normal')
        callback()
    }

    public _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        this.endTime = Date.now()
        // error 可能为 null（例如主动 destroy()），也可能包含错误信息
        const reason = error ? `error: ${error.message}` : 'destroyed'
        this.finishIfNeeded('abnormal', reason)
        callback(error || undefined)
    }

    public getTotalBytes() {
        return this.count
    }

    private finishIfNeeded(kind: 'normal' | 'abnormal', reason?: string) {
        if (this.printed) return
        this.printed = true

        if (!this.startTime) this.startTime = this.endTime || Date.now()

        const endTs = this.endTime || Date.now()
        const durationMs = Math.max(1, endTs - this.startTime)
        const durationSec = durationMs / 1000

        const avgBytesPerSec = this.count / durationSec
        const avgBitsPerSec = avgBytesPerSec * 8

        const totalHuman = BandwidthCount.formatBytes(this.count)
        const avgHumanBytes = BandwidthCount.formatBytes(avgBytesPerSec)
        const avgMbps = (avgBitsPerSec / 1e6).toFixed(3)

        const head = `${this.tab} ${kind === 'normal' ? 'end' : 'end(abnormal)'} at ${endTs}` +
            (reason ? ` reason=${reason}` : '')

        if (!this.count) {
            logger(`${head} BandwidthCount ${this.count} bytes (no data)`)
            return
        }

        logger(
            `${head} BandwidthCount ${this.count} bytes (${totalHuman}), ` +
            `duration ${durationSec.toFixed(3)}s, ` +
            `avg ${avgHumanBytes}/s (${avgMbps} Mbps)`
        )
    }

    private static formatBytes(n: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        let v = n
        let i = 0
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024
            i++
        }
        return i === 0 ? `${Math.round(v)} ${units[i]}` : `${v.toFixed(2)} ${units[i]}`
    }
}