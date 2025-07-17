import { logger } from "./logger"
import {join} from 'node:path'
import fs from 'node:fs'
import * as unzipper from 'unzipper'
import http from 'node:http'
import { inspect } from "node:util"
import os from 'node:os'

const MAX_REDIRECTS = 5 // 防止无限重定向
const tempUpdatePath = join(os.tmpdir(), `conet-update-${Date.now()}`)
/**
 * 辅助函数：下载文件并流式解压到指定路径
 * @param downloadUrl 文件的URL
 * @param extractPath 解压的目标路径
 * @param redirectCount 当前重定向次数
 */
const downloadAndUnzip = (downloadUrl: string, extractPath: string, redirectCount = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (redirectCount > MAX_REDIRECTS) {
            return reject(new Error('超过最大重定向次数'))
        }
		const options = { agent: httpAgent }
		// 在此处添加 headers

        http.get(downloadUrl, options, (response) => {
            // 处理重定向
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                logger(`下载被重定向到: ${response.headers.location}`)
                return downloadAndUnzip(response.headers.location, extractPath, redirectCount + 1).then(resolve).catch(reject)
            }

            if (response.statusCode !== 200) {
                return reject(new Error(`下载失败，状态码: ${response.statusCode}`))
            }

            // 将下载流直接导入解压器
            response.pipe(unzipper.Extract({ path: extractPath }))
                .on('finish', resolve)
                .on('error', reject)
        }).on('error', (err) => {
			logger(`downloadAndUnzip Error`, err.message)
		})
    })
}
const httpAgent = new http.Agent({ keepAlive: false })

/**
 * 辅助函数：发起 GET 请求，处理重定向，并以文本形式返回响应体。
 * @param requestUrl 请求的 URL
 * @param redirectCount 当前重定向次数
 * @returns Promise，解析为响应体字符串
 */
const fetchText = (requestUrl: string, redirectCount = 0): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('超过最大重定向次数'))
    }
	logger(`fetchText access ${requestUrl}`)
	const options = { agent: httpAgent }
	// 在此处添加 headers

    http.get(requestUrl, options, (response) => {
		// 处理重定向
		if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
				logger(`被重定向到: ${response.headers.location}`)
				return fetchText(response.headers.location, redirectCount + 1).then(resolve).catch(reject)
		}
		
		// 处理请求错误
		if (response.statusCode && response.statusCode >= 400) {
			return reject(new Error(`请求失败，状态码: ${response.statusCode}`))
		}
		logger(`fetchText success!`)
		let body = ''
		response.setEncoding('utf8')
		response.on('data', (chunk) => { body += chunk; })
		response.on('end', () => {
			logger(`response.on('end') ${body}`)
			resolve(body)
		})
    }).on('error', (err) => {
		logger(`fetchText Error`, err.message)
  	})
  })
}

/**
 * 从节点列表中随机选择一个节点
 * @param nodes 节点信息数组
 * @returns 随机选中的一个节点信息对象
 */

const getRandomNode = (nodes: nodes_info[]): nodes_info => {
	if (!nodes || nodes.length === 0) {
		throw new Error('节点列表为空，无法选择节点。')
	}
	const randomIndex = Math.floor(Math.random() * nodes.length)
	return nodes[randomIndex]
}

/**
 * 验证解压后的文件夹内容是否符合预期的文件结构。
 * @param folderPath 要检查的文件夹根路径
 * @returns 如果验证通过则返回 true，否则返回 false
 */
const validateUpdateContents = async (folderPath: string, ver: string, nodes: nodes_info[]): Promise<boolean> => {
	logger('🔍 开始验证和修复更新内容...')
    const manifestPath = join(folderPath, 'asset-manifest.json')

    try {
        // 1. 检查并读取 asset-manifest.json
        if (!fs.existsSync(manifestPath)) {
            logger('🔴 验证失败: 关键文件 asset-manifest.json 未找到！')
            // 如果清单都不存在，可以尝试下载它本身
            const randomNode = getRandomNode(nodes)
            const manifestUrl = `http://${randomNode.ip_addr}/silentpass-rpc/asset-manifest.json`
            logger(`尝试下载缺失的 asset-manifest.json from ${manifestUrl}`)
            await downloadSingleFileHttp(manifestUrl, manifestPath)
        }

        const manifestContent = fs.readFileSync(manifestPath, 'utf8')
        const manifest = JSON.parse(manifestContent)

        if (!manifest.files || typeof manifest.files !== 'object') {
            logger('🔴 验证失败: asset-manifest.json 格式不正确或不包含 "files" 对象。')
            return false
        }

        // 2. 收集所有缺失的文件，并准备下载
        const downloadPromises: Promise<void>[] = []
        const filePaths = Object.values(manifest.files) as string[]

        for (const filePath of filePaths) {
            // Create React App 的路径通常以 / 开头，需要移除
            const localFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath
            const fullPath = join(folderPath, localFilePath)

            if (!fs.existsSync(fullPath)) {
                logger(`🟡 文件缺失: ${localFilePath}。准备下载...`)
                
                const randomNode = getRandomNode(nodes)
                const downloadUrl = `http://${randomNode.ip_addr}/silentpass-rpc/${localFilePath}`
                
                // 将下载任务的 Promise 添加到数组中
                downloadPromises.push(downloadSingleFileHttp(downloadUrl, fullPath))
            }
        }

        // 3. 如果有缺失的文件，则并行下载它们
        if (downloadPromises.length > 0) {
            logger(`发现 ${downloadPromises.length} 个缺失文件，开始并行下载修复...`)
            await Promise.all(downloadPromises)
            logger('✅ 所有缺失文件已下载完成！')
        } else {
            logger('✅ 所有文件均存在，无需修复。')
        }

        // 4. 所有文件都就绪后，执行最终的检查（例如读取 update.json）
        await readUpdateInfo(folderPath, ver)

        logger('✅ 更新内容验证和修复成功！')
        return true

    } catch (error) {
        logger('🔴 验证或修复过程中发生严重错误:', error);
        return false
    }
}

/**
 * 下载单个文件（支持 HTTPS）并保存到指定路径。
 * @param downloadUrl 文件的完整下载 URL (https://...)
 * @param destinationPath 本地保存的完整路径
 */
const downloadSingleFileHttp = (downloadUrl: string, destinationPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        
        const dir = join(destinationPath, '..')
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
		const options = { agent: httpAgent }
		
        const fileStream = fs.createWriteStream(destinationPath)
		logger(`Download ${downloadUrl}`)
        http.get(downloadUrl, options, (response) => {
            if (response.statusCode !== 200) {
                fileStream.close();
                fs.unlink(destinationPath, () => {}); // 清理不完整的文件
                return reject(new Error(`下载单个文件失败 [${response.statusCode}]: ${downloadUrl}`));
            }
            response.pipe(fileStream)
        }).on('error', (err) => {
            fs.unlink(destinationPath, () => {})
            reject(err)
        })

        fileStream.on('finish', () => {
            fileStream.close()
            resolve()
        })

        fileStream.on('error', (err) => {
            fs.unlink(destinationPath, () => {})
            reject(err)
        })
    })
}

/**
 * Reads and parses the update.json file from a specified folder.
 *
 * @param staticFolder The path to the directory containing update.json.
 * @returns A Promise that resolves to the UpdateInfo object, or null if an error occurs.
 */
export const readUpdateInfo = async (staticFolder: string, ver: string): Promise<UpdateInfo | null> => new Promise(executor => {
    // Construct the full path to the update.json file
    const filePath = join(staticFolder, 'update.json')

    
	// Read the file's content asynchronously
	fs.readFile(filePath, 'utf8', (err, fileContent) => {
		// Parse the JSON string into an object and cast it to the UpdateInfo type
		if (err) {
			logger(`readUpdateInfo get ${filePath} Error!`)
			
			if (!ver) {
				return executor(null)
			}

			const data: UpdateInfo = {
				ver,
				filename: `${ver}.zip`
			}
			fs.writeFileSync(filePath, JSON.stringify(data), 'utf8')
			return executor(data)
		}

		try {
			const updateData: UpdateInfo = JSON.parse(fileContent)
			logger(`readUpdateInfo success`, inspect(updateData, false, 3, true))
			return executor(updateData)
		}catch (ex) {
			logger(`readUpdateInfo JSON.parse(fileContent) ${fileContent} Error!`)
			return executor(null)
		}
		
	})
    
})




/**
 * 主更新函数
 */
export const runUpdater = async (nodes: nodes_info[], currentVer: UpdateInfo, reactFolder: string, restart: () => Promise<void> ) => {


  logger('🚀 开始执行动态节点更新程序...')

  try {

    
    const selectedNode = getRandomNode(nodes)
    logger(`✅ 节点列表获取成功！已随机选择节点: ${selectedNode.ip_addr} (位于 ${selectedNode.region})`);

    // --- 步骤 2: 使用选定节点的 IP 获取更新信息 ---
    // 使用节点的 IP 地址构建 API 的基础 URL
    const baseApiUrl = `http://${selectedNode.ip_addr}/silentpass-rpc/`
    const updateJsonUrl = `${baseApiUrl}update.json`

    // --- 步骤 2: 使用选定节点的 IP 获取更新信息 ---
	
    const updateInfoText = await fetchText(updateJsonUrl)
	logger(`正在从选定节点 ${updateJsonUrl} 获取更新信息... updateInfoText = ${updateInfoText}`)
    const updateInfo: UpdateInfo = JSON.parse(updateInfoText)

    
    if (!updateInfo.filename) {
      	throw new Error('无法从 JSON 响应中获取文件名。')
    }

    logger(`✅ 获取信息成功！最新版本: ${updateInfo.ver}, 文件名: ${updateInfo.filename}`)

	const updateVer = isNewerVersion(currentVer.ver, updateInfo.ver)
	if (!updateVer) {
		return logger(`runUpdater [No update]!`)
	}
    // --- 步骤 3: 从选定节点下载并解压文件 ---
    const downloadUrl = `${baseApiUrl}${updateInfo.filename}`
    // 关键改动 2: 不再使用 __dirname，而是使用 userData 目录
	// 这确保了我们将文件解压到 Electron 应用的可写区域
	const userDataPath = reactFolder
	const extractPath = join(userDataPath, 'workers')
	// 定义最终的工作目录和临时的更新目录
    const finalWorkersPath = join(reactFolder, 'workers');
	// 1. 解压到临时目录
    fs.mkdirSync(tempUpdatePath, { recursive: true })


	logger(`⏳ 正在从 ${downloadUrl} 下载并解压...`);
	
	logger(`创建临时更新目录: ${tempUpdatePath}`)
	// 确保目标目录存在
	// 这个逻辑在这里依然有效，它会创建 userData/workers 目录（如果尚不存在）
	if (!fs.existsSync(extractPath)) {
		fs.mkdirSync(extractPath, { recursive: true })
	}

	await downloadAndUnzip(downloadUrl, tempUpdatePath)
    logger(`🎉 成功下载并解压文件到 ${tempUpdatePath}`)

	// 2. 验证内容
        if (!(await validateUpdateContents(tempUpdatePath, updateInfo.ver, nodes))) {
            throw new Error('下载的内容无效或不完整，已终止更新。')
        }


	// 3. 原子化替换
        logger('准备替换工作目录...')
        const backupPath = `${finalWorkersPath}_old_${Date.now()}`

		// a. 如果旧目录存在，将其重命名为备份（这是一个原子操作）
        if (fs.existsSync(finalWorkersPath)) {
            fs.renameSync(finalWorkersPath, backupPath)
            logger(`旧目录已备份到: ${backupPath}`)
        }

		// b. 将新的、已验证的临时目录重命名为工作目录（这是另一个原子操作）
        fs.renameSync(tempUpdatePath, finalWorkersPath);
        logger(`✅ 更新成功！工作目录已指向新版本: ${finalWorkersPath}`)

        // c. 如果存在备份，则删除备份
        if (fs.existsSync(backupPath)) {
            fs.rmSync(backupPath, { recursive: true, force: true })
            logger(`旧的备份目录已清理。`)
        }
		await restart()

  	} catch (error) {
		console.error('❌ 更新过程中发生错误:', error instanceof Error ? error.message : error)
	} finally {
        // 4. 清理：无论成功或失败，最后都尝试删除临时目录
        if (fs.existsSync(tempUpdatePath)) {
            fs.rmSync(tempUpdatePath, { recursive: true, force: true })
            logger(`临时更新目录已清理。`)
        }
    }
}
// 执行更新程序

/**
 * 比较两个语义化版本号。
 * @param oldVer 旧版本号，如 "0.18.0"
 * @param newVer 新版本号，如 "0.18.1"
 * @returns 如果 newVer 比 oldVer 新，则返回 true；否则返回 false。
 */
function isNewerVersion(oldVer: string, newVer: string): boolean {
    const oldParts = oldVer.split('.').map(Number)
    const newParts = newVer.split('.').map(Number)

    for (let i = 0; i < oldParts.length; i++) {
        if (newParts[i] > oldParts[i]) {
            return true
        }
        if (newParts[i] < oldParts[i]) {
            return false
        }
    }

    return false // 如果版本号完全相同，则不是更新的版本
}

