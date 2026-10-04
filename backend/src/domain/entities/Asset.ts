export interface AssetProps {
  assetTag: string;
  assetType: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export class Asset {
  constructor(private readonly props: AssetProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.assetTag) throw new Error("Asset Tag is required");
    if (!this.props.assetType) throw new Error("Asset Type is required");
    if (!this.props.category) throw new Error("Category is required");
    if (!this.props.manufacturer) throw new Error("Manufacturer is required");
    if (!this.props.model) throw new Error("Model is required");
    if (!this.props.serialNumber) throw new Error("Serial Number is required");
    if (!this.props.status) throw new Error("Status is required");
  }

  get data(): AssetProps {
    return this.props;
  }
}