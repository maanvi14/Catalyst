import os
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Lazy loaded variables
_model = None
_chroma_client = None

def _get_model():
    """
    Lazy loads the sentence-transformers model once.
    """
    global _model
    if _model is None:
        logger.info("Initializing SentenceTransformer model 'all-MiniLM-L6-v2'...")
        from sentence_transformers import SentenceTransformer
        # Load the model (small, CPU-friendly)
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def _get_chroma_client():
    """
    Lazy loads the ChromaDB persistent client once.
    """
    global _chroma_client
    if _chroma_client is None:
        logger.info("Initializing ChromaDB persistent client at './chroma_store'...")
        import chromadb
        _chroma_client = chromadb.PersistentClient(path="./chroma_store")
    return _chroma_client

def rebuild_index(db: Session):
    """
    Rebuilds the ChromaDB vector index by re-embedding all documents.
    """
    from app.services.rag import get_all_documents
    
    logger.info("Starting ChromaDB index rebuild...")
    
    # 1. Get all documents
    docs = get_all_documents(db)
    
    # 2. Get ChromaDB client and collection
    client = _get_chroma_client()
    
    try:
        client.delete_collection("catalyst_docs")
        logger.info("Deleted existing 'catalyst_docs' collection.")
    except Exception:
        # Collection might not exist yet
        pass
        
    collection = client.create_collection(
        name="catalyst_docs",
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )
    
    if not docs:
        logger.info("No documents found to index.")
        return
        
    ids = [doc["id"] for doc in docs]
    texts = [doc["text"] for doc in docs]
    metadatas = [doc["metadata"] for doc in docs]
    
    # Load model and compute embeddings
    model = _get_model()
    embeddings = model.encode(texts).tolist()
    
    # Add to collection
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas
    )
    logger.info(f"Successfully indexed {len(docs)} documents in ChromaDB.")

def semantic_search(query: str, top_k: int = 5) -> list[tuple[str, float]]:
    """
    Performs a semantic search in ChromaDB and returns list of (doc_id, similarity_score) pairs.
    """
    client = _get_chroma_client()
    try:
        collection = client.get_collection(name="catalyst_docs")
    except Exception:
        logger.warning("ChromaDB collection 'catalyst_docs' not found. Returning empty search results.")
        return []
        
    count = collection.count()
    if count == 0:
        return []
        
    model = _get_model()
    query_embedding = model.encode([query]).tolist()[0]
    
    # Query ChromaDB (limiting n_results to the number of items in the collection)
    n_results = min(top_k, count)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    
    if not results or "ids" not in results or not results["ids"]:
        return []
        
    ids = results["ids"][0]
    distances = results["distances"][0]
    
    pairs = []
    for doc_id, dist in zip(ids, distances):
        # Cosine distance = 1.0 - cosine_similarity
        # So cosine_similarity = 1.0 - distance
        similarity = 1.0 - dist
        pairs.append((doc_id, similarity))
        
    return pairs
