export interface AssetProps {
  assetTag: string;
  assetType: string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export class Asset {
  constructor(private readonly props: AssetProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.assetTag) throw new Error('Asset Tag is required');
    if (!this.props.assetType) throw new Error('Asset Type is required');
    if (!this.props.category) throw new Error('Category is required');
    if (!this.props.status) throw new Error('Status is required');
  }

  get data(): AssetProps {
    const clean = (v: string | null | undefined): string | null => {
      if (v === null || v === undefined) return null;
      const t = String(v).trim();
      return t === '' ? null : t;
    };
    return {
      ...this.props,
      assetTag: String(this.props.assetTag).trim(),
      assetType: String(this.props.assetType).trim(),
      category: String(this.props.category).trim(),
      manufacturer: clean(this.props.manufacturer),
      model: clean(this.props.model),
      serialNumber: clean(this.props.serialNumber),
      status: String(this.props.status).trim(),
    };
  }
}
