
import build from 'pino-abstract-transport'
import dayjs from 'dayjs'
import SonicBoom from 'sonic-boom'
import fs from 'fs'
import { TransportOptions, TimeDiffUnit } from "../types/index"

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
  let history: any[] = []

  return build(async function (source) {
    for await (let row of source) {
      const file: string = opts.file.replace(/%(.*)%/g, (_, fmt) => dayjs().format(fmt))
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
        history.push({
          file: logfile.file,
          create_at: logfile.create_at
        })

        // 删除过期文件
        history = history.filter(log => {
          const limitUnit: TimeDiffUnit = opts.limit.match(/([a-z]+)$/)[0] as TimeDiffUnit
          const limitNum: string = opts.limit.match(/^(\d+)/)[0]
          if (dayjs().diff(log.create_at, limitUnit, true) > Number(limitNum)) {
            fs.unlinkSync(log.file)
            return false
          }
          return true
        })

        // 开新文件
        logfile.sonic.reopen(file)
        logfile.file = file
        logfile.create_at = dayjs()
      }

      // JSON 输出
      const rowJson = JSON.parse(row)

      // level 数值转为 label
      if (rowJson.level) {
        rowJson.level = LEVEL_LABELS[rowJson.level] || rowJson.level
      }

      if (opts.json === true) {
        logfile.sonic.write(JSON.stringify(rowJson) + '\n')
      } else {
        // 格式自定义
        if (typeof opts.formatter === 'function') {
          logfile.sonic.write(opts.formatter(rowJson + '\n'))
        } else {
          const { time, level, pid, hostname, ...params } = rowJson
          logfile.sonic.write(`[${time} - ${hostname}(${pid}) - ${level}] `)
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

