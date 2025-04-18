class ResourceNotFoundException extends ApplicationException {
    constructor(message, resourceType, resourceId) {
      super(message, 'RESOURCE_NOT_FOUND');
      this.resourceType = resourceType;
      this.resourceId = resourceId;
    }
  }