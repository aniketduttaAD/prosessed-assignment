import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prismaClient";

export async function getDepartments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const search = (req.query.search as string | undefined)?.trim() ?? "";

    const departments = await prisma.department.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : undefined,
      orderBy: { name: "asc" },
      take: 10,
    });

    res.json(
      departments.map((d: { id: number; name: string }) => ({
        id: d.id,
        name: d.name,
      })),
    );
  } catch (err) {
    next(err);
  }
}
