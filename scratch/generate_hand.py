"""
Test script to generate full anatomical hand points with normal lighting and render a multi-angle projection.
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def generate_full_anatomical_hand():
    points = []
    normals = []
    
    # Helper to add points with normals
    def add_pt(x, y, z, nx, ny, nz):
        points.append([x, y, z])
        normals.append([nx, ny, nz])
        
    # -------------------------------------------------------------
    # 1. FOREARM (팔뚝)
    # -------------------------------------------------------------
    # Line of action: from (-0.85, -2.40, -0.15) to (-0.22, -0.95, 0.0)
    # Angle is roughly 25 degrees from vertical.
    N_FOREARM = 4000
    for _ in range(N_FOREARM):
        t = np.random.uniform(0, 1)
        # Centerline
        cx = -0.85 * (1 - t) + (-0.22) * t
        cy = -2.40 * (1 - t) + (-0.95) * t
        cz = -0.15 * (1 - t) + 0.0 * t
        
        # Radii: Elbow (0.28 x 0.22) -> Wrist (0.15 x 0.10)
        # Muscle bulge on outer forearm at t=0.35
        muscle = 1.0 + 0.14 * np.exp(-((t - 0.38) / 0.16)**2)
        rx = (0.28 * (1 - t) + 0.15 * t) * muscle
        rz = (0.22 * (1 - t) + 0.10 * t)
        
        # Tangent: dx = 0.63, dy = 1.45
        T = np.array([0.63, 1.45, 0.15])
        T = T / np.linalg.norm(T)
        # Perp vectors
        U = np.array([-T[1], T[0], 0])
        U = U / np.linalg.norm(U)
        V = np.cross(T, U)
        
        theta = np.random.uniform(0, 2 * np.pi)
        nx = np.cos(theta)
        nz = np.sin(theta)
        
        # Surface position
        px = cx + rx * nx * U[0] + rz * nz * V[0]
        py = cy + rx * nx * U[1] + rz * nz * V[1]
        pz = cz + rx * nx * U[2] + rz * nz * V[2]
        
        # Approximate surface normal
        N = nx * U + nz * V
        add_pt(px, py, pz, N[0], N[1], N[2])
        
    # -------------------------------------------------------------
    # 2. WRIST & PALM (손목 및 손바닥)
    # -------------------------------------------------------------
    # Wrist (-0.22, -0.95, 0.0) to Knuckle Arch (y ≈ -0.65)
    N_PALM = 3500
    for _ in range(N_PALM):
        t = np.random.uniform(0, 1) # 0 at wrist, 1 at knuckles
        # Palm widens from wrist (0.15) to knuckle arch (0.26)
        width = 0.15 * (1 - t) + 0.26 * t
        thick = 0.10 * (1 - t) + 0.12 * t
        
        u = np.random.uniform(-0.5, 0.5) # lateral across palm
        v = np.random.uniform(-0.5, 0.5) # dorsal / palmar
        
        # Centerline of palm
        cx = -0.22 * (1 - t) + 0.0 * t
        cy = -0.95 + t * 0.32 # -0.95 to -0.63
        cz = 0.02 * t
        
        # Muscle mound: Thenar (thumb pad) on u < -0.15, t < 0.6
        thenar = 0.0
        if u < -0.1 and t < 0.7:
            thenar = 0.08 * np.exp(-((u + 0.3)**2 + (t - 0.35)**2) / 0.04)
            
        px = cx + u * width * 2.0
        py = cy + np.random.uniform(-0.01, 0.01)
        pz = cz + v * thick * 2.0 + thenar
        
        ny = 0.3
        nz = 1.0 if v >= 0 else -1.0
        nx = np.sign(u) * 0.4
        norm = np.sqrt(nx**2 + ny**2 + nz**2)
        add_pt(px, py, pz, nx/norm, ny/norm, nz/norm)

    # -------------------------------------------------------------
    # 3. CURLED FINGERS (Middle, Ring, Pinky)
    # -------------------------------------------------------------
    curled = [
        # (knuckle_x, knuckle_y, knuckle_z, length, radius)
        (-0.02, -0.63, 0.04, 0.52, 0.042), # Middle
        ( 0.08, -0.66, 0.03, 0.48, 0.038), # Ring
        ( 0.17, -0.71, 0.02, 0.40, 0.033), # Pinky
    ]
    for kx, ky, kz, flen, frad in curled:
        N_FINGER = 1200
        for _ in range(N_FINGER):
            s = np.random.uniform(0, 1) # 0 at knuckle, 1 at tip
            # Curl trajectory: forward and curled inward
            phi = s * np.pi * 1.55
            fy = ky - np.sin(phi * 0.65) * (flen * 0.70)
            fz = kz + (1 - np.cos(phi * 0.75)) * (flen * 0.45)
            fx = kx + np.sin(s * 0.2) * 0.01
            
            theta = np.random.uniform(0, 2 * np.pi)
            # Taper
            r = frad * (1.0 - s * 0.25)
            # Knuckle joint bumps at s=0.35 and 0.70
            joint_bump = 0.006 * np.exp(-((s - 0.35)/0.08)**2) + 0.005 * np.exp(-((s - 0.70)/0.08)**2)
            r += joint_bump
            
            px = fx + r * np.cos(theta)
            py = fy + r * np.sin(theta) * 0.6
            pz = fz + r * np.sin(theta) * 0.8
            
            nx = np.cos(theta)
            ny = np.sin(theta) * 0.6
            nz = np.sin(theta) * 0.8
            norm = np.sqrt(nx**2 + ny**2 + nz**2)
            add_pt(px, py, pz, nx/norm, ny/norm, nz/norm)

    # -------------------------------------------------------------
    # 4. FOLDED THUMB (엄지손가락)
    # -------------------------------------------------------------
    N_THUMB = 1400
    for _ in range(N_THUMB):
        s = np.random.uniform(0, 1)
        # Trajectory from thenar base (-0.24, -0.92, 0.06) to over middle finger (-0.05, -0.70, 0.18)
        tx = -0.24 * (1 - s) + (-0.05) * s
        ty = -0.92 * (1 - s) + (-0.70) * s + np.sin(s * np.pi) * 0.06
        tz = 0.06 * (1 - s) + 0.18 * s + np.sin(s * np.pi) * 0.04
        
        r = 0.050 * (1.0 - s * 0.22) + 0.006 * np.exp(-((s - 0.5)/0.12)**2)
        theta = np.random.uniform(0, 2 * np.pi)
        px = tx + r * np.cos(theta)
        py = ty + r * np.sin(theta) * 0.6
        pz = tz + r * np.sin(theta) * 0.8
        
        nx = np.cos(theta)
        ny = np.sin(theta) * 0.6
        nz = np.sin(theta) * 0.8
        norm = np.sqrt(nx**2 + ny**2 + nz**2)
        add_pt(px, py, pz, nx/norm, ny/norm, nz/norm)

    # -------------------------------------------------------------
    # 5. EXTENDED INDEX FINGER (곧게 뻗은 검지손가락)
    # -------------------------------------------------------------
    # Knuckle at (-0.11, -0.63, 0.04) -> Tip at (0.0, -0.02, 0.0)
    N_INDEX = 2500
    for _ in range(N_INDEX):
        s = np.random.uniform(0, 1) # 0 at knuckle, 1 at fingertip
        
        # Smooth S-curve converging to (0, -0.02, 0)
        # Proximal knuckle (-0.11) -> PIP (-0.05) -> DIP (-0.015) -> Tip (0.0)
        fx = -0.11 * (1 - s)**1.4
        fy = -0.63 + s * 0.61 # -0.63 to -0.02
        fz = 0.04 * (1 - s)**1.4
        
        # Natural tapering: knuckle 0.046 -> tip 0.026
        base_r = 0.046 - s * 0.020
        # PIP joint bump at s=0.38, DIP at s=0.72
        joint1 = 0.007 * np.exp(-((s - 0.38)/0.07)**2)
        joint2 = 0.005 * np.exp(-((s - 0.72)/0.07)**2)
        r = base_r + joint1 + joint2
        
        theta = np.random.uniform(0, 2 * np.pi)
        px = fx + r * np.cos(theta)
        py = fy + np.random.uniform(-0.003, 0.003)
        pz = fz + r * np.sin(theta)
        
        nx = np.cos(theta)
        ny = 0.1
        nz = np.sin(theta)
        norm = np.sqrt(nx**2 + ny**2 + nz**2)
        add_pt(px, py, pz, nx/norm, ny/norm, nz/norm)

    # Fingertip apex pad (dense dome)
    N_APEX = 500
    for _ in range(N_APEX):
        phi = np.random.uniform(0, np.pi * 0.5)
        theta = np.random.uniform(0, 2 * np.pi)
        r = 0.026 * np.sqrt(np.random.uniform(0, 1))
        px = r * np.sin(phi) * np.cos(theta)
        py = -0.02 + r * np.cos(phi)
        pz = r * np.sin(phi) * np.sin(theta)
        add_pt(px, py, pz, 0, 1, 0)

    return np.array(points), np.array(normals)

pts, norms = generate_full_anatomical_hand()
print("Total anatomical points:", pts.shape[0])

# Render a quick scatter plot
fig, ax = plt.subplots(figsize=(6, 8))
ax.set_facecolor('#0c0a08')
fig.patch.set_facecolor('#0c0a08')

# Shading: light from top-front-right (0.5, 0.8, 0.6)
L = np.array([0.4, 0.7, 0.6])
L = L / np.linalg.norm(L)
dots = np.clip(np.sum(norms * L, axis=1), 0.1, 1.0)

colors = np.zeros((pts.shape[0], 4))
colors[:, 0] = 0.85 + 0.15 * dots
colors[:, 1] = 0.88 + 0.12 * dots
colors[:, 2] = 1.0
colors[:, 3] = 0.75 + 0.25 * dots

ax.scatter(pts[:, 0], pts[:, 1], c=colors, s=1.2, edgecolors='none')
ax.set_xlim(-1.2, 0.8)
ax.set_ylim(-2.6, 0.3)
ax.set_aspect('equal')
ax.axis('off')
plt.savefig('scratch/test_hand.png', dpi=150, bbox_inches='tight', facecolor='#0c0a08')
print("Saved scratch/test_hand.png")
