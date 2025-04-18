// src/application/utils/PaginationHelper.js

/**
 * Helper do paginacji danych
 */
class PaginationHelper {
    /**
     * Tworzy parametry paginacji
     * @param {Object} options Opcje paginacji
     * @param {number} options.page Numer strony
     * @param {number} options.limit Limit wyników
     * @param {string} options.orderBy Pole do sortowania
     * @param {boolean} options.ascending Kierunek sortowania
     * @returns {Object} Parametry paginacji
     */
    static createPaginationParams(options) {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const offset = (page - 1) * limit;
      
      return {
        page,
        limit,
        offset,
        orderBy: options.orderBy || 'created_at',
        ascending: options.ascending || false
      };
    }
    
    /**
     * Tworzy metadane paginacji
     * @param {Object} params Parametry paginacji
     * @param {number} totalCount Całkowita liczba wyników
     * @returns {Object} Metadane paginacji
     */
    static createPaginationMeta(params, totalCount) {
      const totalPages = Math.ceil(totalCount / params.limit);
      const hasNextPage = params.page < totalPages;
      const hasPrevPage = params.page > 1;
      
      return {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      };
    }
    
    /**
     * Tworzy linki do paginacji
     * @param {Object} meta Metadane paginacji
     * @param {string} baseUrl Bazowy URL
     * @param {Object} queryParams Parametry zapytania
     * @returns {Object} Linki do paginacji
     */
    static createPaginationLinks(meta, baseUrl, queryParams = {}) {
      const createUrl = (page) => {
        const url = new URL(baseUrl);
        
        // Dodaj parametry zapytania
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
          }
        });
        
        // Dodaj parametr strony
        url.searchParams.set('page', page);
        
        return url.toString();
      };
      
      return {
        self: createUrl(meta.page),
        first: createUrl(1),
        last: createUrl(meta.totalPages),
        prev: meta.hasPrevPage ? createUrl(meta.page - 1) : null,
        next: meta.hasNextPage ? createUrl(meta.page + 1) : null
      };
    }
  }
  
  export default PaginationHelper;