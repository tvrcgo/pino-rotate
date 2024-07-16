# pino-rotate

An pino transport for rotating log files

## Example
```js
const logger = pino({
  level: 'debug',
  transport: {
    targets: [
      {
        target: 'pino-rotate',
        options: {
          file: './logs/app-%YYYY-MM-DD%.log',
          limit: '3m',
        },
      }
    ]
  }
})
```
