// 在力场计算后恢复分子位置
function restoreMoleculePosition(molecule, originalPosition, offset = {
    x: 0,
    y: 0,
    z: 0
}) {
    // 获取当前分子的中心位置
    const currentAtoms = molecule.selectedAtoms({});
    let currentCenter = {
        x: 0,
        y: 0,
        z: 0
    };
    currentAtoms.forEach(atom => {
        currentCenter.x += atom.x;
        currentCenter.y += atom.y;
        currentCenter.z += atom.z;
    });
    currentCenter.x /= currentAtoms.length;
    currentCenter.y /= currentAtoms.length;
    currentCenter.z /= currentAtoms.length;

    // 计算需要的平移量
    const dx = originalPosition.center.x - currentCenter.x + offset.x;
    const dy = originalPosition.center.y - currentCenter.y + offset.y;
    const dz = originalPosition.center.z - currentCenter.z + offset.z;

    // 应用平移
    currentAtoms.forEach(atom => {
        atom.x += dx;
        atom.y += dy;
        atom.z += dz;
    });


}



// 格式化字符串
function formatOpenBabelError(errorMessage) {
    let formattedMessage = errorMessage.replace(/==============================/g, '');
    formattedMessage = formattedMessage.replace(/\\n/g, '\n');
    formattedMessage = formattedMessage.trim();
    return formattedMessage;
}

function convertToXYZ(atoms) {
    let xyzContent = atoms.length + "\n\n";
    atoms.forEach(atom => {
        xyzContent += `${atom.elem} ${atom.x.toFixed(4)} ${atom.y.toFixed(4)} ${atom.z.toFixed(4)}\n`;
    });
    return xyzContent;
}