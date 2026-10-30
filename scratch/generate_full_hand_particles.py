import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# 1. Load baked skinned hand data
with open('C:/Users/aicam/.gemini/antigravity/brain/432fc7df-1796-4cdb-b73b-fc2c3d322f06/scratch/skinned_hand_data.json') as f:
    data = json.load(f)

hand_pos = np.array(data['positions']).reshape(-1, 3)
hand_norm = np.array(data['normals']).reshape(-1, 3)
hand_indices = np.array(data['indices']).reshape(-1, 3)

# 2. Add realistic forearm extension connected to the bottom wrist ring
# Find vertices with y < 0.8
wrist_mask = hand_pos[:, 1] < 0.8
wrist_indices = np.where(wrist_mask)[0]
wrist_pts = hand_pos[wrist_indices]
wrist_center = wrist_pts.mean(axis=0)

# Sort wrist points by angle around center in XZ plane
angles = np.arctan2(wrist_pts[:, 2] - wrist_center[2], wrist_pts[:, 0] - wrist_center[0])
order = np.argsort(angles)
ordered_wrist_pts = wrist_pts[order]

# Create forearm extension
forearm_slices = 25
forearm_vertices = []
forearm_normals = []
forearm_faces = []

# Forearm line of action: curves gently downwards and slightly back/inwards
# In model space: Y goes down from 0 to -16 cm.
# Forearm tapers from elbow (radius ~ 4.2 x 3.2 cm) to wrist (radius ~ 3.8 x 2.6 cm)
num_ring = len(ordered_wrist_pts)
last_ring_idx = list(wrist_indices[order])

# Base vertices from hand
all_pos = list(hand_pos)
all_norm = list(hand_norm)
all_indices = list(hand_indices)

for s in range(1, forearm_slices + 1):
    t = s / forearm_slices
    # Curve forearm: Y goes down, X curves slightly, Z curves
    # Length: 15 cm
    offset_y = -t * 15.0
    offset_x = -t * 2.2 # slight natural angle
    offset_z = -t * 1.5
    
    # Muscle bulge (brachioradialis on lateral side, t=0.4~0.7)
    muscle = 1.0 + 0.18 * np.exp(-((t - 0.55) / 0.22)**2)
    scale = (1.0 + t * 0.15) * muscle
    
    current_ring_idx = []
    for j in range(num_ring):
        p0 = ordered_wrist_pts[j]
        # Vector from wrist center
        rel = p0 - wrist_center
        # New vertex
        new_p = wrist_center + rel * scale + np.array([offset_x, offset_y, offset_z])
        
        # Approximate normal
        norm_v = np.array([rel[0], 0.1, rel[2]])
        norm_v = norm_v / (np.linalg.norm(norm_v) + 1e-6)
        
        idx = len(all_pos)
        all_pos.append(new_p)
        all_norm.append(norm_v)
        current_ring_idx.append(idx)
        
    # Connect last ring to current ring with quad faces (2 triangles per segment)
    for j in range(num_ring):
        j_next = (j + 1) % num_ring
        v0 = last_ring_idx[j]
        v1 = last_ring_idx[j_next]
        v2 = current_ring_idx[j_next]
        v3 = current_ring_idx[j]
        
        all_indices.append([v0, v1, v2])
        all_indices.append([v0, v2, v3])
        
    last_ring_idx = current_ring_idx

all_pos = np.array(all_pos)
all_norm = np.array(all_norm)
all_indices = np.array(all_indices)

# 3. Transform: Fingertip apex to (0, 0, 0), align index finger vertically
# Find apex of index finger (highest point in hand)
apex = all_pos[hand_pos[:, 1].argmax()].copy()
print("Original Apex:", apex)

# Translate so apex is at origin
all_pos -= apex

# Let's inspect orientation:
# Wrist is at Y ≈ -21 cm, forearm bottom at Y ≈ -36 cm.
# Index finger points along +Y!
print("Transformed bounds:", all_pos.min(axis=0), all_pos.max(axis=0))

# Scale to scene units: total height ~2.8 units
# From apex (Y=0) down to forearm base (Y=-36), scale = 2.8 / 36 ≈ 0.078
SCALE = 0.075
all_pos *= SCALE

# 4. Uniform Surface Particle Sampling (18,000 points)
# Compute triangle areas for weighted sampling
v0 = all_pos[all_indices[:, 0]]
v1 = all_pos[all_indices[:, 1]]
v2 = all_pos[all_indices[:, 2]]

cross = np.cross(v1 - v0, v2 - v0)
areas = 0.5 * np.linalg.norm(cross, axis=1)
probs = areas / areas.sum()

TOTAL_PARTICLES = 18000
chosen_triangles = np.random.choice(len(all_indices), size=TOTAL_PARTICLES, p=probs)

# Sample points on triangles via barycentric coordinates
r1 = np.random.uniform(0, 1, size=TOTAL_PARTICLES)
r2 = np.random.uniform(0, 1, size=TOTAL_PARTICLES)
sqrt_r1 = np.sqrt(r1)

u = 1 - sqrt_r1
v = sqrt_r1 * (1 - r2)
w = sqrt_r1 * r2

tri_v0 = all_pos[all_indices[chosen_triangles, 0]]
tri_v1 = all_pos[all_indices[chosen_triangles, 1]]
tri_v2 = all_pos[all_indices[chosen_triangles, 2]]

sampled_pts = (u[:, None] * tri_v0 + v[:, None] * tri_v1 + w[:, None] * tri_v2)

# Sample normals
tri_n0 = all_norm[all_indices[chosen_triangles, 0]]
tri_n1 = all_norm[all_indices[chosen_triangles, 1]]
tri_n2 = all_norm[all_indices[chosen_triangles, 2]]
sampled_norms = u[:, None] * tri_n0 + v[:, None] * tri_n1 + w[:, None] * tri_n2
norm_lens = np.linalg.norm(sampled_norms, axis=1, keepdims=True) + 1e-6
sampled_norms /= norm_lens

print("Sampled points shape:", sampled_pts.shape)
print("Bounds of sampled points:", sampled_pts.min(axis=0), sampled_pts.max(axis=0))

# Save point cloud data as lightweight JSON (points and normals)
export_data = {
    "points": sampled_pts.flatten().tolist(),
    "normals": sampled_norms.flatten().tolist()
}
with open('frontend/public/models/anatomical_hand_particles.json', 'w') as f:
    json.dump(export_data, f)
print("Saved frontend/public/models/anatomical_hand_particles.json!")

# Render test plot with 3D lighting
for angle in [0, 30, 45, -30]:
    rad = np.radians(angle)
    rot_y = np.array([
        [np.cos(rad), 0, np.sin(rad)],
        [0, 1, 0],
        [-np.sin(rad), 0, np.cos(rad)]
    ])
    r_pts = sampled_pts @ rot_y.T
    r_norms = sampled_norms @ rot_y.T
    
    fig, ax = plt.subplots(figsize=(6, 8))
    ax.set_facecolor('#0c0a08')
    fig.patch.set_facecolor('#0c0a08')
    
    L = np.array([0.4, 0.6, 0.7])
    L = L / np.linalg.norm(L)
    shading = np.clip(np.sum(r_norms * L, axis=1), 0.12, 1.0)
    
    c = np.zeros((len(sampled_pts), 4))
    c[:, 0] = 0.88 + 0.12 * shading
    c[:, 1] = 0.90 + 0.10 * shading
    c[:, 2] = 1.0
    c[:, 3] = 0.85
    
    ax.scatter(r_pts[:, 0], r_pts[:, 1], c=c, s=0.8, edgecolors='none')
    ax.set_aspect('equal')
    ax.axis('off')
    plt.savefig(f'scratch/full_arm_rot_{angle}.png', dpi=150, bbox_inches='tight', facecolor='#0c0a08')
    plt.close()

print("Saved test renders!")

