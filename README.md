# pino-rotate

A pino transport for rotating log files

```bash
npm install --save pino-rotate
```

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
          limit: '7d',
        },
      }
    ]
  }
})
```
