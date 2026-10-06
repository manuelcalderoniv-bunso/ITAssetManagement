const STORE_KEY = "itams_asset_knowledge";

const BASE = {
  Dell: "Enterprise-grade manufacturer. Latitude and OptiPlex lines are standard in corporate environments; parts availability is strong and warranty terms are typically 3 years.",
  Lenovo: "ThinkPad is the long-standing business line, known for keyboard quality and durability. ThinkCentre covers desktops; ThinkPad usually carries a 3-year warranty.",
  HP: "ProBook and ProDesk are the volume business lines. Common in SMEs; mid-range build with a 1-3 year warranty depending on the reseller.",
  Apple: "MacBook Air is a thin, long-battery-life machine for design and creative work. Warranty is 1 year standard, extendable to 3. Resale value holds well.",
  Asus: "ExpertBook is the business range. Good value; common in sales teams where cost per unit matters more than ruggedisation.",
  Acer: "TravelMate is the business line, positioned at the entry level. Suitable for light office work; expect a shorter battery service life.",
  Epson: "EcoTank inkjet printers use refillable tanks - notably low cost per page. Common in accounting and HR where print volume is steady but not heavy.",
  Canon: "imageCLASS and PIXMA cover mono laser and inkjet. Reliable for document printing; consumables are widely available.",
  Brother: "Compact laser printers with low fuss. L2375 and L2540 are standard office mono units.",
  Samsung: "S-series monitors are the volume office range. Reliable panels at a low price point; 3-year warranty is common.",
  LG: "Widely used office monitors, including 4K models for design work. Strong panel consistency.",
  AOC: "Budget monitor range. Adequate for standard office work; thinner warranty cover.",
  "TP-Link": "Unmanaged switches are the low-cost backbone of small office networks. Low failure rate; long operational life relative to price.",
  Cisco: "Catalyst switches are the enterprise standard for core networking. Higher cost, but long service life and strong support contracts.",
  Ubiquiti: "UniFi wireless access points. Centrally managed through a controller; popular for covering multi-floor offices cheaply.",
  Fortinet: "FortiGate is a perimeter firewall line. Carries subscription services for threat protection - track renewal dates carefully.",
  APC: "Back-UPS units protect equipment from brownouts and surges. Battery replacement is the normal maintenance event.",
  CyberPower: "UPS units at a lower price point than APC. Adequate for single-workstation protection.",
  Logitech: "Peripherals - keyboards, mice, webcams. Consumable-grade items, replaced rather than repaired.",
};

const CATEGORY_NOTES = {
  Laptop: "Carried by the employee and most exposed to loss and damage. Assignments should name a custodian.",
  Desktop: "Fixed workstation. Longer service life than laptops; upgrades are usually possible.",
  Printer: "Shared equipment. Track consumables and the next service date rather than individual custody.",
  Monitor: "Typically paired one-to-one with a workstation. Low failure rate.",
  "Network Device": "Shared infrastructure in the server room. Downtime affects the whole office.",
  UPS: "Protective equipment. Battery replacement is the main maintenance event.",
  Other: "General inventory item.",
};

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function write(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked - learning silently pauses
  }
}

function keyOf(asset) {
  const maker = asset.manufacturer ?? "Unknown";
  const model = asset.model ?? "";
  return (maker + " " + model).trim();
}

/**
 * Learns from the current register. Called on every load, so the engine
 * accumulates knowledge as new devices are added through the system.
 */
export function learnFromAssets(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return 0;

  const store = read();
  let learned = 0;

  for (const a of assets) {
    const key = keyOf(a);
    if (!key || key === "Unknown") continue;

    const entry = store[key] ?? {
      seen: 0,
      categories: [],
      departments: [],
      statuses: [],
      warrantyMonths: [],
      source: "learned",
    };

    entry.seen += 1;

    if (a.category && !entry.categories.includes(a.category)) {
      entry.categories.push(a.category);
    }
    if (a.department && !entry.departments.includes(a.department)) {
      entry.departments.push(a.department);
    }
    if (a.status && !entry.statuses.includes(a.status)) {
      entry.statuses.push(a.status);
    }
    if (a.warrantyEnd && a.purchaseDate) {
      const months = Math.round(
        (new Date(a.warrantyEnd) - new Date(a.purchaseDate)) /
          (1000 * 60 * 60 * 24 * 30.44)
      );
      if (months > 0 && months < 200) entry.warrantyMonths.push(months);
    }

    store[key] = entry;
    learned += 1;
  }

  write(store);
  return learned;
}

export function knowledgeCount() {
  return Object.keys(read()).length;
}

/** Full background on one asset. */
export function describeAsset(asset) {
  if (!asset) return null;

  const store = read();
  const key = keyOf(asset);
  const learned = store[key];

  const lines = [];

  if (BASE[asset.manufacturer]) lines.push(BASE[asset.manufacturer]);
  if (CATEGORY_NOTES[asset.category]) lines.push(CATEGORY_NOTES[asset.category]);

  if (learned) {
    const avg =
      learned.warrantyMonths.length > 0
        ? Math.round(
            learned.warrantyMonths.reduce((s, m) => s + m, 0) /
              learned.warrantyMonths.length
          )
        : null;

    const times = learned.seen === 1 ? "time" : "times";
    const bits = ["Seen " + learned.seen + " " + times + " in this register."];
    if (learned.departments.length) {
      bits.push("Departments: " + learned.departments.join(", ") + ".");
    }
    if (avg) bits.push("Typical warranty in our records: about " + avg + " months.");
    lines.push(bits.join(" "));
  } else if (key !== "Unknown") {
    lines.push(
      "First time this model appears in the register - the system will learn its pattern as more units are added."
    );
  }

  if (asset.warrantyEnd) {
    const days = Math.ceil(
      (new Date(asset.warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) lines.push("Warranty expired " + Math.abs(days) + " days ago.");
    else if (days < 180) lines.push("Warranty expires in " + days + " days - renew soon.");
    else lines.push("Warranty runs until " + asset.warrantyEnd + " (" + days + " days).");
  }

  return {
    title: key === "Unknown" ? asset.assetType ?? "Asset" : key,
    lines,
  };
}

/** Free-text questions answered strictly from the loaded register. */
export function answer(question, assets) {
  const q = (question ?? "").toLowerCase().trim();
  if (!q) return null;
  if (!Array.isArray(assets) || assets.length === 0) {
    return "The asset register is empty, so there is nothing to look up yet.";
  }

  const count = (fn) => assets.filter(fn).length;

  if (/how many|ilan/.test(q)) {
    if (/laptop/.test(q))
      return (
        count((a) => a.category === "Laptop" || a.assetType === "Laptop") +
        " laptops in the register."
      );
    if (/printer/.test(q))
      return (
        count((a) => a.category === "Printer" || a.assetType === "Printer") +
        " printers in the register."
      );
    if (/monitor/.test(q))
      return (
        count((a) => a.category === "Monitor" || a.assetType === "Monitor") +
        " monitors in the register."
      );
    if (/network/.test(q))
      return count((a) => a.category === "Network Device") + " network devices in the register.";
    if (/available/.test(q))
      return count((a) => a.status === "Available") + " assets are available.";
    if (/issued|assigned/.test(q))
      return count((a) => a.status === "Issued") + " assets are currently issued.";
    if (/maintenance|repair/.test(q))
      return count((a) => a.status === "Maintenance") + " assets are in maintenance.";
    if (/retired|disposed/.test(q))
      return (
        count((a) => a.status === "Retired" || a.status === "Disposed") +
        " assets are retired or disposed."
      );
    return assets.length + " assets in total.";
  }

  if (/warranty|expir/.test(q)) {
    const soon = assets.filter((a) => {
      if (!a.warrantyEnd) return false;
      const days = (new Date(a.warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 365;
    });
    if (soon.length === 0) return "No warranties expire within the next twelve months.";
    const value = soon.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
    return (
      soon.length +
      " assets have warranties expiring within twelve months, covering PHP " +
      value.toLocaleString() +
      "."
    );
  }

  if (/brand|manufacturer|marami/.test(q)) {
    const tally = {};
    for (const a of assets) {
      const k = a.manufacturer ?? "Unknown";
      tally[k] = (tally[k] ?? 0) + 1;
    }
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => k + ": " + v)
      .join(" - ");
  }

  if (/department/.test(q)) {
    const tally = {};
    for (const a of assets) {
      const k = a.department ?? "Unassigned";
      tally[k] = (tally[k] ?? 0) + 1;
    }
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => k + " " + v)
      .join(" - ");
  }

  return 'I could not match that to a specific lookup. Try: "how many laptops", "warranty expiring", "top brands", or "assets by department".';
}