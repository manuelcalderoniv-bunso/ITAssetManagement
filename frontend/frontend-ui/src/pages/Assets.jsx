import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../api/client";

const EMPTY = { assetTag: "", assetType: "", status: "Available" };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setAssets(await apiGet("/assets"));
      setError("");
    } catch (err) {
      setError("Could not load assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssets(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addAsset = async () => {
    try {
      await apiSend("/assets", "POST", form);
      setForm(EMPTY);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateAsset = async () => {
    try {
      await apiSend(`/assets/${editingTag}`, "PUT", {
        assetType: form.assetType,
        status: form.status,
      });
      setEditingTag(null);
      setForm(EMPTY);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAsset = async (tag) => {
    if (!confirm(`Delete ${tag}?`)) return;
    try {
      await apiSend(`/assets/${tag}`, "DELETE");
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const editAsset = (asset) => {
    setEditingTag(asset.assetTag);
    setForm({ assetTag: asset.assetTag, assetType: asset.assetType, status: asset.status });
  };

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.assetTag?.toLowerCase().includes(q) ||
      a.assetType?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.manufacturer?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      a.status?.toLowerCase().includes(q) ||
      a.createBy?.toLowerCase().includes(q) ||
      a.updatedBy?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <h1>Assets Management</h1>
      <button onClick={loadAssets}>Refresh</button>

      <br /><br />
      <input placeholder="Search Asset..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <h3>{editingTag ? "Edit Asset" : "Add Asset"}</h3>
      <input name="assetTag" placeholder="Asset Tag" value={form.assetTag} onChange={handleChange} disabled={!!editingTag} />
      <input name="assetType" placeholder="Asset Type" value={form.assetType} onChange={handleChange} />
      <select name="status" value={form.status} onChange={handleChange}>
        <option>Available</option><option>Issued</option><option>Maintenance</option><option>Retired</option>
      </select>

      {editingTag ? (
        <button onClick={updateAsset}>Update Asset</button>
      ) : (
        <button onClick={addAsset}>Save Asset</button>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table>
        <thead><tr><th>Asset Tag</th><th>Asset Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan="4">Loading...</td></tr> :
            filtered.map((a, i) => (
              <tr key={i}>
                <td>{a.assetTag}</td>
                <td>{a.assetType}</td>
                <td>{a.category}</td>
                <td>{a.manufacturer}</td>
                <td>{a.model}</td>
                <td>{a.serialNumber}</td>
                <td>{a.status}</td>
                <td>{a.createdBy}</td>
                <td>{a.updatedBy}</td>
                <td>
                  <button onClick={() => editAsset(a)}>Edit</button>
                  <button onClick={() => deleteAsset(a.assetTag)}>Delete</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
