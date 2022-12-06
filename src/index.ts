import { execSync } from "child_process"
import { gray, greenBright, yellowBright } from "colorette"
import { copyFile } from "fs/promises"
import path from "path"
import fs from "fs/promises"

const DEV_DEPS = [
    "@wdio/cli@7",
    "@wdio/local-runner@7",
    "@wdio/mocha-framework@7",
    "@wdio/spec-reporter@7",
    "wdio-chromedriver-service@7",
    "wdio-ui5-service",
    "chromedriver"
]

const DEV_DEPS_TS = [...DEV_DEPS, "ts-node", "typescript"]
let configPath = "./"
let fullConfigPath: string | undefined
let BASE_URL = "http://localhost:8080/index.html"
let SPECS = "./webapp/test/**/*.test.js"

export async function run() {
    process.env.DEBUG && console.info("//> process.argv:")
    process.env.DEBUG && console.info(process.argv)

    if (process.argv.find((arg) => arg.includes("configPath"))) {
        const index = process.argv.findIndex((arg) => arg.includes("configPath")) + 1
        configPath = process.argv[index]
        fullConfigPath = path.resolve(process.cwd(), configPath)
        const rootDirExists = await fs.access(fullConfigPath).then(
            () => true,
            () => false
        )
        if (!rootDirExists) {
            await fs.mkdir(fullConfigPath, { recursive: true })
        }
    }

    process.argv.find((arg) => arg.includes("ts")) ? await initTS() : await initJS()
}

async function initJS() {
    console.log(gray(`≡> copying wdio.conf.js into "${configPath}"`))
    await copyFile(
        `${__dirname}/../templates/wdio.conf.js`,
        `${fullConfigPath ? fullConfigPath : process.cwd()}/wdio.conf.js`
    )
    await _replacePlaceholder()
    console.log(greenBright("👍 done!"))

    console.log(gray("≡> installing wdio + wdi5 and adding them as dev dependencies..."))
    execSync(`npm i ${DEV_DEPS.join(" ")} --save-dev`, { stdio: "inherit" })
    console.log(greenBright("👍 done!"))

    console.log(gray('≡> adding wdi5 start command ("wdi5") to package.json...'))
    execSync(`npm pkg set scripts.wdi5="wdio run ${configPath ? configPath : process.cwd()}/wdio.conf.js"`, {
        stdio: "inherit"
    })
    console.log(greenBright("👍 done!"))
}

async function initTS() {
    console.log(gray('≡> copying tsconfig.json into "./test/"...'))
    await copyFile(
        `${__dirname}/../templates/test/tsconfig.json`,
        `${fullConfigPath ? fullConfigPath : process.cwd()}/test/tsconfig.json`
    )
    console.log(gray(`≡> copying wdio.conf.ts into "${configPath}"`))
    await copyFile(
        `${__dirname}/../templates/wdio.conf.ts`,
        `${fullConfigPath ? fullConfigPath : process.cwd()}/wdio.conf.ts`
    )
    console.log(greenBright("👍 done!"))

    console.log(gray("≡> installing wdio + wdi5 and adding them as dev dependencies..."))
    execSync(`npm i ${DEV_DEPS_TS.join(" ")} --save-dev`, { stdio: "inherit" })
    console.log(greenBright("👍 done!"))

    console.log(
        yellowBright(`\n≡> if your're using eslint, please add the "test"'s tsconfig.json to its' project setting:
    "project": ["./tsconfig.json", "./test/tsconfig.json"]\n`)
    )

    console.log(gray("≡> adding wdi5 start command to package.json..."))
    execSync(`npm pkg set scripts.wdi5="wdio run ${configPath ? configPath : process.cwd()}/wdio.conf.ts"`, {
        stdio: "inherit"
    })
    console.log(greenBright("👍 done!"))
}

async function _replacePlaceholder() {
    if (process.argv.find((arg) => arg.includes("specs"))) {
        const index = process.argv.findIndex((arg) => arg.includes("specs")) + 1
        SPECS = process.argv[index]
    }

    if (process.argv.find((arg) => arg.includes("baseUrl"))) {
        const index = process.argv.findIndex((arg) => arg.includes("baseUrl")) + 1
        BASE_URL = process.argv[index]
    }

    const data = await fs.readFile(`${fullConfigPath ? fullConfigPath : process.cwd()}/wdio.conf.js`)
    let fileString = data.toString()
    fileString = fileString.replace(/%specs%/g, SPECS)
    fileString = fileString.replace(/%baseUrl%/g, BASE_URL)
    await fs.writeFile(`${fullConfigPath ? fullConfigPath : process.cwd()}/wdio.conf.js`, fileString)
}
