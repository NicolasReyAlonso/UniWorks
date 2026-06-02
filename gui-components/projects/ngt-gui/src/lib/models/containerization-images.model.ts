export interface ContainerizationImageItem {
  id: string,
  uuid: string,
  name: string,
  image_type: string,
  location: string,
  recipe: { [key: string]: any }
}

export interface ContainerizationImageItemResponse {
  content: ContainerizationImageItem,
  count: number,
  issues: any[]
}

export interface ContainerizationImagesItemResponse {
  content: ContainerizationImageItem[],
  count: number,
  issues: any[]
}

