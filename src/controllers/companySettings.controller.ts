import { Request, Response } from "express";
import { prisma } from "../config/database";
import { uploadToCloudinary } from "../config/cloudinary";
import logger from "../utils/logger";

const KEYS = ["COMPANY_NAME", "COMPANY_TAGLINE", "COMPANY_LOGO"] as const;
type CompanyKey = (typeof KEYS)[number];

// GET /api/admin/company-settings  — public (invoice pages need it)
export const getCompanySettings = async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [...KEYS] } },
    });
    const settings: Record<string, string | null> = {
      COMPANY_NAME: null,
      COMPANY_TAGLINE: null,
      COMPANY_LOGO: null,
    };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.status(200).json({ settings });
  } catch (err: any) {
    logger.error("getCompanySettings error", err);
    res.status(500).json({ message: "Error fetching company settings" });
  }
};

// PUT /api/admin/company-settings  — admin + super admin
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const { companyName, companyTagline, logoUrl } = req.body as {
      companyName?: string;
      companyTagline?: string;
      logoUrl?: string;
    };

    let finalLogoUrl: string | undefined = logoUrl;

    // If a logo file was uploaded, push to Cloudinary
    if (req.file) {
      finalLogoUrl = await uploadToCloudinary(req.file.buffer, "company");
    }

    const updates: { key: CompanyKey; value: string }[] = [];

    if (companyName !== undefined && companyName.trim() !== "") {
      updates.push({ key: "COMPANY_NAME", value: companyName.trim() });
    }
    if (companyTagline !== undefined) {
      updates.push({ key: "COMPANY_TAGLINE", value: companyTagline.trim() });
    }
    if (finalLogoUrl !== undefined) {
      updates.push({ key: "COMPANY_LOGO", value: finalLogoUrl });
    }

    await Promise.all(
      updates.map((u) =>
        prisma.appSetting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        }),
      ),
    );

    // Return the freshest state
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [...KEYS] } },
    });
    const settings: Record<string, string | null> = {
      COMPANY_NAME: null,
      COMPANY_TAGLINE: null,
      COMPANY_LOGO: null,
    };
    for (const row of rows) settings[row.key] = row.value;

    res.status(200).json({ message: "Company settings updated", settings });
  } catch (err: any) {
    logger.error("updateCompanySettings error", err);
    res.status(500).json({ message: "Error updating company settings" });
  }
};
