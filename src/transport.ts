
import build from 'pino-abstract-transport'
import dayjs from 'dayjs'
import SonicBoom from 'sonic-boom'
import fs from 'fs'
import { TransportOptions, TimeDiffUnit } from "../types/index"
import fg from 'fast-glob'

const LEVEL_LABELS = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
}

export default async function (opts: TransportOptions) {

  let logfile: any = {}

  const clean = () => {
    const limitUnit: TimeDiffUnit = opts.limit.match(/([a-z]+)$/)[0] as TimeDiffUnit
    const limitNum: string = opts.limit.match(/^(\d+)/)[0]
    const logs = fg.globSync([opts.file.replace(/%(.*)%/g, '*')], { onlyFiles: true })

    for (const log of logs) {
      const stats = fs.statSync(log)
      if (dayjs().diff(dayjs(stats.mtime), limitUnit, true) > Number(limitNum)) {
        fs.unlinkSync(log)
      }
    }
  }

  return build(async function (source) {
    const file: string = opts.file.replace(/%(.*)%/g, (_, fmt) => dayjs().format(fmt))
    for await (let row of source) {
      if (!logfile.file) {
        logfile = {
          file,
          sonic: new SonicBoom({
            dest: file,
            mkdir: true,
          }),
          create_at: dayjs(),
        }
      }

      if (logfile.file !== file) {
        // 旧文件归档
        logfile.sonic.flush()

        // 开新文件
        logfile.sonic.reopen(file)
        logfile.file = file
        logfile.create_at = dayjs()

        // 删除过期文件
        clean()
      }

      // JSON 输出
      let rowJson = JSON.parse(row)

      // level 数值转为 label
      if (rowJson.level) {
        rowJson.level = LEVEL_LABELS[rowJson.level] || rowJson.level
      }

      // 预处理 JSON
      if (typeof opts.filter === 'function') {
        rowJson = opts.filter.call(this, rowJson)
      }

      if (opts.json === true) {
        // JSON 格式
        logfile.sonic.write(JSON.stringify(rowJson) + '\n')
      } else {
        // 格式自定义
        if (typeof opts.formatter === 'function') {
          logfile.sonic.write(opts.formatter(rowJson + '\n'))
        } else {
          // 默认格式
          const { time, level, pid, hostname, ...params } = rowJson
          logfile.sonic.write(`[${time} - ${hostname}(${pid}) - ${String(level).toUpperCase()}] `)
          logfile.sonic.write(Object.entries(params).map(([k, v]) => `${k}=${v + ''}`).join(' ') + '\n')
        }
      }
    }

  }, {
    parse: 'lines',
    async close() {
      if (logfile.sonic) {
        logfile.sonic.end()
      }
    }
  })
}

