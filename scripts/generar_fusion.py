import os
import numpy as np

DATADIR = os.path.join(os.path.dirname(__file__), "..", "data")

def main():
    clip_path = os.path.join(DATADIR, "embeddings_clip.npy")
    openclip_path = os.path.join(DATADIR, "embeddings_openclip.npy")
    siglip_path = os.path.join(DATADIR, "embeddings_siglip.npy")
    out_path = os.path.join(DATADIR, "embeddings_fusion.npy")

    print("Cargando índices individuales...")
    emb_clip = np.load(clip_path).astype(np.float32)
    emb_openclip = np.load(openclip_path).astype(np.float32)
    emb_siglip = np.load(siglip_path).astype(np.float32)

    assert emb_clip.shape[0] == emb_openclip.shape[0] == emb_siglip.shape[0], "Desfase en número de embeddings"

    print("Concatenando y normalizando vectores...")
    # Normalizar cada uno por si acaso
    n_clip = np.linalg.norm(emb_clip, axis=1, keepdims=True)
    n_clip[n_clip == 0] = 1e-10
    emb_clip /= n_clip

    n_openclip = np.linalg.norm(emb_openclip, axis=1, keepdims=True)
    n_openclip[n_openclip == 0] = 1e-10
    emb_openclip /= n_openclip

    n_siglip = np.linalg.norm(emb_siglip, axis=1, keepdims=True)
    n_siglip[n_siglip == 0] = 1e-10
    emb_siglip /= n_siglip

    emb_fusion = np.concatenate([emb_clip, emb_openclip, emb_siglip], axis=1)

    n_fusion = np.linalg.norm(emb_fusion, axis=1, keepdims=True)
    n_fusion[n_fusion == 0] = 1e-10
    emb_fusion /= n_fusion

    np.save(out_path, emb_fusion)
    print(f"¡Índice de fusión creado con éxito! Shape: {emb_fusion.shape}")

if __name__ == "__main__":
    main()
