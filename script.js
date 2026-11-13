/**
 * Kalkulator Subnet IPv4
 * Logika perhitungan IP, Subnet Mask, Wildcard, Network, Broadcast, Range Host, dan Visualisasi Biner
 */

// Utility: Format number with thousands separator (Indonesian locale)
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Convert dotted-decimal IP to 32-bit unsigned integer
function ipToInt(ip) {
  const octets = ip.trim().split('.');
  if (octets.length !== 4) return null;
  let intVal = 0;
  for (let i = 0; i < 4; i++) {
    const oct = Number(octets[i]);
    if (isNaN(oct) || oct < 0 || oct > 255 || octets[i].trim() === '') {
      return null;
    }
    intVal = (intVal * 256) + oct;
  }
  return intVal >>> 0;
}

// Convert 32-bit unsigned integer to dotted-decimal IP
function intToIp(intVal) {
  return [
    (intVal >>> 24) & 255,
    (intVal >>> 16) & 255,
    (intVal >>> 8) & 255,
    intVal & 255
  ].join('.');
}

// Convert 32-bit unsigned integer to Hexadecimal string
function intToHex(intVal) {
  return '0x' + intVal.toString(16).toUpperCase().padStart(8, '0');
}

// Generate Subnet Mask integer from prefix length (0 - 32)
function prefixToMask(prefix) {
  if (prefix === 0) return 0;
  return ((0xFFFFFFFF << (32 - prefix)) >>> 0);
}

// Determine IP Class
function getIpClass(firstOctet) {
  if (firstOctet === 0) return { name: 'Reserved (0.0.0.0)', range: '0.0.0.0 - 0.255.255.255' };
  if (firstOctet >= 1 && firstOctet <= 126) return { name: 'Kelas A', range: '1.0.0.0 - 126.255.255.255' };
  if (firstOctet === 127) return { name: 'Kelas A (Loopback)', range: '127.0.0.0 - 127.255.255.255' };
  if (firstOctet >= 128 && firstOctet <= 191) return { name: 'Kelas B', range: '128.0.0.0 - 191.255.255.255' };
  if (firstOctet >= 192 && firstOctet <= 223) return { name: 'Kelas C', range: '192.0.0.0 - 223.255.255.255' };
  if (firstOctet >= 224 && firstOctet <= 239) return { name: 'Kelas D (Multicast)', range: '224.0.0.0 - 239.255.255.255' };
  return { name: 'Kelas E (Eksperimental)', range: '240.0.0.0 - 255.255.255.255' };
}

// Determine IP Type (Private, Public, Loopback, APIPA, etc.)
function getIpType(ipInt) {
  const o1 = (ipInt >>> 24) & 255;
  const o2 = (ipInt >>> 16) & 255;

  // 10.0.0.0/8
  if (o1 === 10) return { type: 'IP Privat (RFC 1918)', tagClass: 'tag-private' };
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (o1 === 172 && (o2 >= 16 && o2 <= 31)) return { type: 'IP Privat (RFC 1918)', tagClass: 'tag-private' };
  // 192.168.0.0/16
  if (o1 === 192 && o2 === 168) return { type: 'IP Privat (RFC 1918)', tagClass: 'tag-private' };
  // 127.0.0.0/8 Loopback
  if (o1 === 127) return { type: 'Loopback (Localhost)', tagClass: 'tag-special' };
  // 169.254.0.0/16 APIPA
  if (o1 === 169 && o2 === 254) return { type: 'APIPA / Link-Local', tagClass: 'tag-special' };
  // 100.64.0.0/10 Carrier Grade NAT
  if (o1 === 100 && (o2 >= 64 && o2 <= 127)) return { type: 'Shared CGNAT (RFC 6598)', tagClass: 'tag-special' };
  // 224.0.0.0 - 239.255.255.255 Multicast
  if (o1 >= 224 && o1 <= 239) return { type: 'Multicast', tagClass: 'tag-special' };
  // 240.0.0.0+ Reserved
  if (o1 >= 240) return { type: 'Reserved', tagClass: 'tag-special' };
  if (o1 === 0) return { type: 'Alamat Khusus / Default Route', tagClass: 'tag-special' };

  return { type: 'IP Publik (Internet)', tagClass: 'tag-public' };
}

// Convert 32-bit integer to styled binary HTML with network/host highlights
function formatBinaryHighlighted(intVal, prefix, isMask = false) {
  const binaryStr = (intVal >>> 0).toString(2).padStart(32, '0');
  let result = '';

  for (let i = 0; i < 32; i++) {
    if (i > 0 && i % 8 === 0) {
      result += '<span class="bit-sep">.</span>';
    }
    const bit = binaryStr[i];
    if (i < prefix) {
      result += `<span class="bit-n">${bit}</span>`;
    } else {
      result += `<span class="bit-h">${bit}</span>`;
    }
  }

  return result;
}

// DOM Elements
const ipInput = document.getElementById('ipInput');
const prefixSelect = document.getElementById('prefixSelect');
const prefixInput = document.getElementById('prefixInput');
const prefixSlider = document.getElementById('prefixSlider');
const sliderValue = document.getElementById('sliderValue');
const ipError = document.getElementById('ipError');
const clearIpBtn = document.getElementById('clearIpBtn');
const resetBtn = document.getElementById('resetBtn');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const cheatSheetToggle = document.getElementById('cheatSheetToggle');
const cheatSheetContent = document.getElementById('cheatSheetContent');
const cheatSheetCard = cheatSheetToggle.closest('.accordion-card');
const cheatSheetTbody = document.getElementById('cheatSheetTbody');

// Output DOM Elements
const resNetwork = document.getElementById('resNetwork');
const resNetworkCidr = document.getElementById('resNetworkCidr');
const resBroadcast = document.getElementById('resBroadcast');
const resHostRange = document.getElementById('resHostRange');
const resRangeSub = document.getElementById('resRangeSub');
const resUsableHosts = document.getElementById('resUsableHosts');
const resTotalHosts = document.getElementById('resTotalHosts');

const tableIp = document.getElementById('tableIp');
const tableIpType = document.getElementById('tableIpType');
const tableMask = document.getElementById('tableMask');
const tableMaskHex = document.getElementById('tableMaskHex');
const tableWildcard = document.getElementById('tableWildcard');
const tableNetwork = document.getElementById('tableNetwork');
const tableBroadcast = document.getElementById('tableBroadcast');
const tableFirstHost = document.getElementById('tableFirstHost');
const tableLastHost = document.getElementById('tableLastHost');
const tableUsableCount = document.getElementById('tableUsableCount');
const tableTotalCount = document.getElementById('tableTotalCount');
const tableFormula = document.getElementById('tableFormula');
const tableClass = document.getElementById('tableClass');
const tableClassRange = document.getElementById('tableClassRange');

const netBitsCount = document.getElementById('netBitsCount');
const hostBitsCount = document.getElementById('hostBitsCount');
const bitNetBar = document.getElementById('bitNetBar');
const bitHostBar = document.getElementById('bitHostBar');
const binIp = document.getElementById('binIp');
const binMask = document.getElementById('binMask');
const binNetwork = document.getElementById('binNetwork');
const binBroadcast = document.getElementById('binBroadcast');

// Initialize Dropdown & Cheat Sheet
function populatePrefixOptions() {
  prefixSelect.innerHTML = '';
  cheatSheetTbody.innerHTML = '';

  for (let p = 32; p >= 0; p--) {
    const maskInt = prefixToMask(p);
    const maskStr = intToIp(maskInt);
    const wildcardInt = (~maskInt) >>> 0;
    const wildcardStr = intToIp(wildcardInt);

    let totalHosts = Math.pow(2, 32 - p);
    let usableHosts;
    if (p === 32) usableHosts = 1;
    else if (p === 31) usableHosts = 2; // RFC 3021
    else usableHosts = Math.max(0, totalHosts - 2);

    // Option for Select
    const option = document.createElement('option');
    option.value = p;
    option.textContent = `/${p} - ${maskStr} (${formatNumber(usableHosts)} Host)`;
    if (p === 24) option.selected = true;
    prefixSelect.appendChild(option);

    // Row for Cheat Sheet Table (in order 0 to 32)
  }

  // Populate Cheat sheet in order 0..32
  for (let p = 0; p <= 32; p++) {
    const maskInt = prefixToMask(p);
    const maskStr = intToIp(maskInt);
    const wildcardInt = (~maskInt) >>> 0;
    const wildcardStr = intToIp(wildcardInt);

    let totalHosts = Math.pow(2, 32 - p);
    let usableHosts;
    let usableText;
    if (p === 32) {
      usableHosts = 1;
      usableText = '1 (Host Tunggal)';
    } else if (p === 31) {
      usableHosts = 2;
      usableText = '2 (P2P RFC 3021)';
    } else if (p === 0) {
      usableHosts = totalHosts - 2;
      usableText = formatNumber(usableHosts);
    } else {
      usableHosts = totalHosts - 2;
      usableText = formatNumber(usableHosts);
    }

    const tr = document.createElement('tr');
    tr.id = `cs-row-${p}`;
    tr.style.cursor = 'pointer';
    tr.title = `Klik untuk memilih prefix /${p}`;
    tr.innerHTML = `
      <td><strong>/${p}</strong></td>
      <td>${maskStr}</td>
      <td>${wildcardStr}</td>
      <td>${usableText}</td>
      <td>${formatNumber(totalHosts)}</td>
    `;
    tr.addEventListener('click', () => {
      setPrefix(p);
    });
    cheatSheetTbody.appendChild(tr);
  }
}

// Current calculation state
let currentResult = null;

// Core Calculation Function
function calculateSubnet() {
  let rawIp = ipInput.value.trim();

  // Check if user entered CIDR notation in the IP field, e.g. 192.168.1.1/24
  if (rawIp.includes('/')) {
    const parts = rawIp.split('/');
    rawIp = parts[0].trim();
    const parsedPrefix = parseInt(parts[1], 10);
    if (!isNaN(parsedPrefix) && parsedPrefix >= 0 && parsedPrefix <= 32) {
      setPrefix(parsedPrefix, false);
    }
  }

  const prefix = parseInt(prefixInput.value, 10);

  // Validate IP
  const ipInt = ipToInt(rawIp);
  if (ipInt === null) {
    ipError.classList.remove('hidden');
    ipInput.style.borderColor = 'var(--accent-rose)';
    return;
  } else {
    ipError.classList.add('hidden');
    ipInput.style.borderColor = '';
  }

  const maskInt = prefixToMask(prefix);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  const totalHosts = Math.pow(2, 32 - prefix);
  let usableHosts;
  let firstHostInt;
  let lastHostInt;
  let rangeString;
  let rangeSubNote;

  if (prefix === 32) {
    usableHosts = 1;
    firstHostInt = networkInt;
    lastHostInt = networkInt;
    rangeString = intToIp(networkInt);
    rangeSubNote = 'Host tunggal (Loopback / Host route)';
  } else if (prefix === 31) {
    usableHosts = 2; // RFC 3021
    firstHostInt = networkInt;
    lastHostInt = broadcastInt;
    rangeString = `${intToIp(firstHostInt)} s/d ${intToIp(lastHostInt)}`;
    rangeSubNote = 'Subnet Point-to-Point (RFC 3021)';
  } else if (prefix === 30) {
    usableHosts = 2;
    firstHostInt = networkInt + 1;
    lastHostInt = broadcastInt - 1;
    rangeString = `${intToIp(firstHostInt)} - ${intToIp(lastHostInt)}`;
    rangeSubNote = '2 Usable Host (Link Point-to-Point standar)';
  } else if (prefix === 0) {
    usableHosts = totalHosts - 2;
    firstHostInt = 1;
    lastHostInt = 0xFFFFFFFE >>> 0;
    rangeString = `0.0.0.1 - 255.255.255.254`;
    rangeSubNote = 'Default route (Semua IPv4 Internet)';
  } else {
    usableHosts = totalHosts - 2;
    firstHostInt = networkInt + 1;
    lastHostInt = broadcastInt - 1;
    rangeString = `${intToIp(firstHostInt)} - ${intToIp(lastHostInt)}`;
    rangeSubNote = `Host Pertama (${intToIp(firstHostInt)}) s/d Terakhir (${intToIp(lastHostInt)})`;
  }

  const firstOctet = (ipInt >>> 24) & 255;
  const ipClassInfo = getIpClass(firstOctet);
  const ipTypeInfo = getIpType(ipInt);

  // Update State
  currentResult = {
    ip: intToIp(ipInt),
    prefix: prefix,
    mask: intToIp(maskInt),
    maskHex: intToHex(maskInt),
    wildcard: intToIp(wildcardInt),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    rangeString: rangeString,
    usableHosts: usableHosts,
    totalHosts: totalHosts,
    ipClass: ipClassInfo.name,
    ipClassRange: ipClassInfo.range,
    ipType: ipTypeInfo.type,
    ipTypeTag: ipTypeInfo.tagClass
  };

  // Render UI
  renderOutputs(currentResult, ipInt, maskInt, networkInt, broadcastInt);
}

// Render values into DOM
function renderOutputs(data, ipInt, maskInt, networkInt, broadcastInt) {
  // Top Stats
  resNetwork.textContent = data.network;
  resNetworkCidr.textContent = `CIDR: ${data.network}/${data.prefix}`;
  resBroadcast.textContent = (data.prefix === 32) ? 'N/A (Host /32)' : data.broadcast;
  resHostRange.textContent = data.rangeString;
  resRangeSub.textContent = (data.prefix >= 31) ? `First: ${data.firstHost} | Last: ${data.lastHost}` : `Rentang host yang siap dipasang pada device`;
  resUsableHosts.textContent = formatNumber(data.usableHosts);
  resTotalHosts.textContent = `Total Alamat IP: ${formatNumber(data.totalHosts)}`;

  // Detail Table
  tableIp.textContent = `${data.ip} /${data.prefix}`;
  tableIpType.textContent = data.ipType;
  tableIpType.className = `tag ${data.ipTypeTag}`;

  tableMask.textContent = data.mask;
  tableMaskHex.textContent = `Hex: ${data.maskHex}`;
  tableWildcard.textContent = data.wildcard;
  tableNetwork.textContent = `${data.network} /${data.prefix}`;
  tableBroadcast.textContent = (data.prefix === 32) ? 'N/A' : data.broadcast;
  tableFirstHost.textContent = data.firstHost;
  tableLastHost.textContent = data.lastHost;
  tableUsableCount.textContent = `${formatNumber(data.usableHosts)} Host`;
  tableTotalCount.textContent = `${formatNumber(data.totalHosts)} Alamat`;

  if (data.prefix === 32) {
    tableFormula.textContent = '1 Alamat host';
  } else if (data.prefix === 31) {
    tableFormula.textContent = '2 Alamat (RFC 3021)';
  } else {
    tableFormula.innerHTML = `2<sup>(32 - ${data.prefix})</sup> - 2 = ${formatNumber(data.usableHosts)}`;
  }

  tableClass.textContent = data.ipClass;
  tableClassRange.textContent = `Rentang: ${data.ipClassRange}`;

  // Binary Representation
  const netBits = data.prefix;
  const hostBits = 32 - netBits;
  netBitsCount.textContent = netBits;
  hostBitsCount.textContent = hostBits;

  const netPct = (netBits / 32) * 100;
  const hostPct = (hostBits / 32) * 100;
  bitNetBar.style.width = `${netPct}%`;
  bitNetBar.textContent = netPct > 12 ? `${netBits} bit Net (${Math.round(netPct)}%)` : '';
  bitHostBar.style.width = `${hostPct}%`;
  bitHostBar.textContent = hostPct > 12 ? `${hostBits} bit Host (${Math.round(hostPct)}%)` : '';

  binIp.innerHTML = formatBinaryHighlighted(ipInt, data.prefix);
  binMask.innerHTML = formatBinaryHighlighted(maskInt, data.prefix, true);
  binNetwork.innerHTML = formatBinaryHighlighted(networkInt, data.prefix);
  binBroadcast.innerHTML = formatBinaryHighlighted(broadcastInt, data.prefix);

  // Update Cheat Sheet active row
  document.querySelectorAll('.cheat-sheet-table tr').forEach(row => row.classList.remove('active-row'));
  const activeRow = document.getElementById(`cs-row-${data.prefix}`);
  if (activeRow) {
    activeRow.classList.add('active-row');
  }

  // Update active state of preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const btnIp = btn.getAttribute('data-ip');
    const btnPrefix = parseInt(btn.getAttribute('data-prefix'), 10);
    if (btnIp === data.ip && btnPrefix === data.prefix) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Synchronize prefix inputs
function setPrefix(p, triggerCalc = true) {
  p = Math.max(0, Math.min(32, parseInt(p, 10) || 0));
  prefixInput.value = p;
  prefixSlider.value = p;
  sliderValue.textContent = p;
  prefixSelect.value = p;

  if (triggerCalc) {
    calculateSubnet();
  }
}

// Event Listeners
ipInput.addEventListener('input', () => {
  calculateSubnet();
});

prefixSelect.addEventListener('change', (e) => {
  setPrefix(e.target.value);
});

prefixInput.addEventListener('input', (e) => {
  setPrefix(e.target.value);
});

prefixSlider.addEventListener('input', (e) => {
  setPrefix(e.target.value);
});

clearIpBtn.addEventListener('click', () => {
  ipInput.value = '';
  ipInput.focus();
  calculateSubnet();
});

resetBtn.addEventListener('click', () => {
  ipInput.value = '192.168.1.100';
  setPrefix(24);
  showToast('Reset ke konfigurasi standar (192.168.1.100/24)');
});

// Preset Buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const ip = btn.getAttribute('data-ip');
    const prefix = parseInt(btn.getAttribute('data-prefix'), 10);
    if (ip) ipInput.value = ip;
    setPrefix(prefix);
  });
});

// Accordion Toggle
cheatSheetToggle.addEventListener('click', () => {
  cheatSheetCard.classList.toggle('open');
  cheatSheetContent.classList.toggle('hidden');
});

// Copy to Clipboard
function copyText(text, successMessage = 'Disalin ke clipboard!') {
  if (!text || text === '-') return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage);
    }).catch(() => fallbackCopy(text, successMessage));
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, msg) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast(msg);
  } catch (err) {
    showToast('Gagal menyalin teks');
  }
  document.body.removeChild(textarea);
}

// Copy single fields
document.querySelectorAll('.copy-field-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const val = targetEl.textContent.trim();
      copyText(val, `Tersalin: ${val}`);
    }
  });
});

// Copy Full Summary
copySummaryBtn.addEventListener('click', () => {
  if (!currentResult) return;
  const summary = `=== KALKULATOR SUBNET IPv4 ===
IP Address         : ${currentResult.ip}/${currentResult.prefix}
Subnet Mask        : ${currentResult.mask} (${currentResult.maskHex})
Wildcard Mask      : ${currentResult.wildcard}
Network Address    : ${currentResult.network}/${currentResult.prefix}
Broadcast Address  : ${currentResult.broadcast}
Rentang Host Valid : ${currentResult.rangeString}
Jumlah Host Valid  : ${formatNumber(currentResult.usableHosts)}
Total Alamat IP    : ${formatNumber(currentResult.totalHosts)}
Kelas & Tipe IP    : ${currentResult.ipClass} | ${currentResult.ipType}
==============================`;

  copyText(summary, 'Ringkasan lengkap berhasil disalin!');
});

// Toast Helper
let toastTimer = null;
function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2600);
}

// Theme Toggle
function initTheme() {
  const savedTheme = localStorage.getItem('subnet-calc-theme') || 'theme-dark';
  document.body.className = savedTheme;
  updateThemeIcons(savedTheme);
}

function updateThemeIcons(theme) {
  if (theme === 'theme-light') {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
}

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.body.classList.contains('theme-light');
  const newTheme = isLight ? 'theme-dark' : 'theme-light';
  document.body.className = newTheme;
  localStorage.setItem('subnet-calc-theme', newTheme);
  updateThemeIcons(newTheme);
});

// App Startup
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  populatePrefixOptions();
  calculateSubnet();
});

