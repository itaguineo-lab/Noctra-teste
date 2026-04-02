2026-04-02T21:30:43.052105174Z ==> Cloning from https://github.com/itaguineo-lab/Noctra-teste
2026-04-02T21:30:43.657984208Z ==> Checking out commit d6f57d61ba4cd85721032b8ce1afbdac5c0f7e57 in branch main
2026-04-02T21:30:45.108362246Z ==> Using Node.js version 22.22.0 (default)
2026-04-02T21:30:45.133038158Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2026-04-02T21:30:47.05382483Z ==> Running build command 'npm install'...
2026-04-02T21:30:51.646950257Z 
2026-04-02T21:30:51.646976347Z added 120 packages, and audited 121 packages in 5s
2026-04-02T21:30:51.647001128Z 
2026-04-02T21:30:51.647012018Z 20 packages are looking for funding
2026-04-02T21:30:51.647017028Z   run `npm fund` for details
2026-04-02T21:30:51.650081795Z 
2026-04-02T21:30:51.650093186Z 3 high severity vulnerabilities
2026-04-02T21:30:51.650095896Z 
2026-04-02T21:30:51.650099006Z To address all issues (including breaking changes), run:
2026-04-02T21:30:51.650102266Z   npm audit fix --force
2026-04-02T21:30:51.650104646Z 
2026-04-02T21:30:51.650107136Z Run `npm audit` for details.
2026-04-02T21:30:53.069179116Z ==> Uploading build...
2026-04-02T21:30:57.612687654Z ==> Uploaded in 3.4s. Compression took 1.1s
2026-04-02T21:30:57.629454636Z ==> Build successful 🎉
2026-04-02T21:31:00.344651633Z ==> Deploying...
2026-04-02T21:31:00.445950437Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2026-04-02T21:31:49.667209472Z ==> Running 'node index.js'
2026-04-02T21:31:50.556953912Z Handler 4 is undefined!
2026-04-02T21:31:50.558489343Z /opt/render/project/src/node_modules/telegraf/lib/composer.js:489
2026-04-02T21:31:50.558501813Z             throw new Error('Handler is undefined');
2026-04-02T21:31:50.558505713Z             ^
2026-04-02T21:31:50.558508743Z 
2026-04-02T21:31:50.558512853Z Error: Handler is undefined
2026-04-02T21:31:50.558516743Z     at Composer.unwrap (/opt/render/project/src/node_modules/telegraf/lib/composer.js:489:19)
2026-04-02T21:31:50.558521223Z     at Composer.compose (/opt/render/project/src/node_modules/telegraf/lib/composer.js:503:29)
2026-04-02T21:31:50.558524353Z     at Composer.command (/opt/render/project/src/node_modules/telegraf/lib/composer.js:359:34)
2026-04-02T21:31:50.558527904Z     at Telegraf.command (/opt/render/project/src/node_modules/telegraf/lib/composer.js:48:34)
2026-04-02T21:31:50.558531233Z     at Object.<anonymous> (/opt/render/project/src/index.js:95:5)
2026-04-02T21:31:50.558534424Z     at Module._compile (node:internal/modules/cjs/loader:1706:14)
2026-04-02T21:31:50.558537884Z     at Object..js (node:internal/modules/cjs/loader:1839:10)
2026-04-02T21:31:50.558540774Z     at Module.load (node:internal/modules/cjs/loader:1441:32)
2026-04-02T21:31:50.558543624Z     at Function._load (node:internal/modules/cjs/loader:1263:12)
2026-04-02T21:31:50.558546424Z     at TracingChannel.traceSync (node:diagnostics_channel:328:14)
2026-04-02T21:31:50.558549164Z 
2026-04-02T21:31:50.558552564Z Node.js v22.22.0
2026-04-02T21:31:52.404782114Z ==> Exited with status 1
2026-04-02T21:31:52.407415828Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys