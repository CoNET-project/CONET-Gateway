import { logger } from "./logger"
import {join} from 'node:path'
import fs from 'node:fs'
import * as unzipper from 'unzipper'
import http from 'node:http'
import currentVer from './workers/update.json'
import { inspect } from "node:util"
// 定义 update.json 的数据结构
interface UpdateInfo {
	ver: string
	filename: string
}
const MAX_REDIRECTS = 5 // 防止无限重定向
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
 * 主更新函数
 */
export const runUpdater = async (nodes: nodes_info[] ) => {


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
    const extractPath = join(__dirname, 'workers')

    logger(`⏳ 正在从 ${downloadUrl} 下载并解压...`)
    logger(`将解压到目录: ${extractPath}`)

    // 确保目标目录存在
    if (!fs.existsSync(extractPath)) {
      	fs.mkdirSync(extractPath, { recursive: true })
    }
	await downloadAndUnzip(downloadUrl, extractPath)
    logger(`🎉 成功下载并解压文件到 ${extractPath}`)

  	} catch (error) {
		console.error('❌ 更新过程中发生错误:', error instanceof Error ? error.message : error)
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
    const oldParts = oldVer.split('.').map(Number);
    const newParts = newVer.split('.').map(Number);

    for (let i = 0; i < oldParts.length; i++) {
        if (newParts[i] > oldParts[i]) {
            return true;
        }
        if (newParts[i] < oldParts[i]) {
            return false;
        }
    }

    return false; // 如果版本号完全相同，则不是更新的版本
}

