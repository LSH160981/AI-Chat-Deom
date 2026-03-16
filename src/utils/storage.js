/**
 * @file storage.js
 * @description localStorage 安全封装
 * 自动处理 JSON 序列化/反序列化，并在出错时安全降级
 * 在不支持 localStorage 的环境（如 SSR、隐私模式被禁用时）也不会抛出异常
 */

/**
 * 从 localStorage 读取值，自动 JSON.parse
 * @param {string} key - 存储键名
 * @param {*} [defaultVal=null] - 读取失败或键不存在时的默认值
 * @returns {*} 解析后的值，或默认值
 */
function get(key, defaultVal = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return defaultVal
    return JSON.parse(raw)
  } catch {
    // JSON.parse 失败 或 localStorage 不可用
    return defaultVal
  }
}

/**
 * 向 localStorage 写入值，自动 JSON.stringify
 * @param {string} key - 存储键名
 * @param {*} val - 要存储的值（会被序列化为 JSON）
 * @returns {boolean} 是否写入成功
 */
function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
    return true
  } catch {
    // 存储空间不足、隐私模式禁用写入等情况
    return false
  }
}

/**
 * 从 localStorage 删除指定键
 * @param {string} key - 存储键名
 * @returns {boolean} 是否删除成功
 */
function remove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * 清空 localStorage 所有数据
 * 注意：此操作不可逆，会清除当前域名下所有本地存储
 * @returns {boolean} 是否清空成功
 */
function clear() {
  try {
    localStorage.clear()
    return true
  } catch {
    return false
  }
}

/**
 * localStorage 安全封装对象
 * @type {{ get: Function, set: Function, remove: Function, clear: Function }}
 */
export const storage = {
  get,
  set,
  remove,
  clear,
}
