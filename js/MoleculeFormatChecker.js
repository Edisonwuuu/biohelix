class MoleculeFormatChecker {
  /**
   * 检查输入字符串是否为 SMILES 格式。
   * @param {string} inputString
   * @returns {boolean}
   */
  static isSmiles(inputString) {
      // 一个基本的 SMILES 正则表达式
      const smilesPattern = /^[A-Z0-9@+\-=#\(\)\[\]]+$/i;
      return smilesPattern.test(inputString.trim());
  }

  /**
   * 检查输入字符串是否为 SDF 格式。
   * SDF 是具有特定头部和分隔符的结构化格式。
   * @param {string} inputString
   * @returns {boolean}
   */
  static isSdf(inputString) {
      // SDF 通常以 "M  END" 结尾，并包含像 "> <" 的属性块
      return inputString.trim().endsWith("M  END") && inputString.includes("> <");
  }

  /**
   * 检查输入字符串是否为 MOL 格式。
   * MOL 格式是 SDF 的一个子集，具有 "M  END" 标记，但通常没有属性块。
   * @param {string} inputString
   * @returns {boolean}
   */
  static isMol(inputString) {
      const lines = inputString.trim().split("\n");
      if (lines.length < 4) return false;
      return lines[lines.length - 1].startsWith("M  END");
  }

  /**
   * 检查输入字符串是否为 InChI 格式。
   * InChI 通常以 "InChI=" 开头。
   * @param {string} inputString
   * @returns {boolean}
   */
  static isInchi(inputString) {
      // InChI 字符串的基本规则
      return inputString.trim().startsWith("InChI=");
  }

  /**
   * 确定输入分子字符串的格式。
   * @param {string} inputString
   * @returns {string} - 确定的格式（"SMILES"、"SDF"、"MOL"、"InChI" 或 "未知格式"）。
   */
  static checkFormat(inputString) {
      if (this.isSmiles(inputString)) {
          return "SMILES";
      } else if (this.isSdf(inputString)) {
          return "SDF";
      } else if (this.isMol(inputString)) {
          return "MOL";
      } else if (this.isInchi(inputString)) {
          return "InChI";
      } else {
          return "Unknown format";
      }
  }
}
