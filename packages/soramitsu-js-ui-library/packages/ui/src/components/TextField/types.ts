export interface ValidationResultEntity {
  isMatching: boolean
  message: string
}

export interface ValidationsList {
  validations: ValidationResultEntity[]
  title: string
  showOnFocusOnly?: boolean
}
