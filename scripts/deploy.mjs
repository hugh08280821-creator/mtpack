// dist 폴더를 gh-pages 브랜치에 올린다 (GitHub Pages가 이 브랜치를 보여준다)
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const run = (cmd, cwd = 'dist') => execSync(cmd, { cwd, stdio: 'inherit' })
const remote = execSync('git remote get-url origin').toString().trim()

writeFileSync('dist/.nojekyll', '')
run('git init -q -b gh-pages')
run('git add -A')
run('git commit -q -m deploy')
run(`git push -f ${remote} gh-pages`)
